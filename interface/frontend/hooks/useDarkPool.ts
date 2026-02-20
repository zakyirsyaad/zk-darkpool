"use client";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
} from "wagmi";
import {
  DARKPOOL_ADDRESS_TOKEN,
  DARKPOOL_ADDRESS_ABI,
} from "@/contracts/Darkpool";
import { API_BASE_URL } from "@/constants/api";

// ERC20 ABI for approval
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface ProofResponse {
  a: string[];
  b: string[][];
  c: string[];
  publicInputs: string[];
}

export interface SettleTradeParams {
  buyer: `0x${string}`;
  seller: `0x${string}`;
}

/**
 * Generate ZK proof from backend matcher
 */
export async function generateProof(
  amountBase: number,
  amountQuote: number,
  ticker: string,
): Promise<ProofResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/match-and-settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountBase, amountQuote, ticker }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "Failed to fetch" || msg.includes("fetch")) {
      throw new Error(
        "Cannot reach backend. Is the server running at " +
          API_BASE_URL +
          "? Check NEXT_PUBLIC_API_URL and try again.",
      );
    }
    throw e;
  }

  if (!res.ok) {
    let errorMessage = "Failed to generate proof";
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

/**
 * Hook for DarkPool contract interactions
 */
export function useDarkPool() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const publicClient = usePublicClient();

  // Read base and quote token addresses
  const { data: baseTokenAddress } = useReadContract({
    address: DARKPOOL_ADDRESS_TOKEN as `0x${string}`,
    abi: DARKPOOL_ADDRESS_ABI,
    functionName: "baseToken",
  });

  const { data: quoteTokenAddress } = useReadContract({
    address: DARKPOOL_ADDRESS_TOKEN as `0x${string}`,
    abi: DARKPOOL_ADDRESS_ABI,
    functionName: "quoteToken",
  });

  /**
   * Wait for a transaction to be mined and check status
   */
  const waitForReceipt = async (hash: `0x${string}`, label: string) => {
    if (!publicClient) throw new Error("Public client not available");

    console.log(`Waiting for ${label} tx to be confirmed: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      throw new Error(`${label} transaction reverted on-chain. Tx: ${hash}`);
    }

    console.log(`${label} tx confirmed in block ${receipt.blockNumber}`);
    return receipt;
  };

  /**
   * Approve token spending for DarkPool contract
   * Waits for the approval tx to be confirmed on-chain
   */
  const approveToken = async (tokenAddress: `0x${string}`, amount: bigint) => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [DARKPOOL_ADDRESS_TOKEN as `0x${string}`, amount],
    });

    // Wait for approval to be mined before continuing
    await waitForReceipt(hash, "Approve");
    return hash;
  };

  /**
   * Settle trade on-chain with ZK proof
   * Waits for the settlement tx to be confirmed on-chain
   */
  const settleTrade = async (
    params: SettleTradeParams & { proof: ProofResponse },
  ) => {
    const { proof, buyer, seller } = params;

    try {
      // a is [2] array
      const a: [bigint, bigint] = [BigInt(proof.a[0]), BigInt(proof.a[1])];

      // b is [2][2] array - already in correct format from exportSolidityCallData
      const b: [[bigint, bigint], [bigint, bigint]] = [
        [BigInt(proof.b[0][0]), BigInt(proof.b[0][1])],
        [BigInt(proof.b[1][0]), BigInt(proof.b[1][1])],
      ];

      // c is [2] array
      const c: [bigint, bigint] = [BigInt(proof.c[0]), BigInt(proof.c[1])];

      // publicInputs is [5] array (Circom output order):
      // [0] = valid, [1] = amountBase (wei), [2] = amountQuote (wei),
      // [3] = midpointPrice, [4] = toleranceBps
      const publicInputs: [bigint, bigint, bigint, bigint, bigint] = [
        BigInt(proof.publicInputs[0]),
        BigInt(proof.publicInputs[1]),
        BigInt(proof.publicInputs[2]),
        BigInt(proof.publicInputs[3]),
        BigInt(proof.publicInputs[4]),
      ];

      // Use amounts directly from the proof's publicInputs so they match exactly.
      // publicInputs[1] = amountBase in wei, publicInputs[2] = amountQuote in wei
      const amountBaseWei = publicInputs[1];
      const amountQuoteWei = publicInputs[2];

      console.log("Calling settleTrade with args:", {
        a: a.map((x) => x.toString()),
        b: b.map((row) => row.map((x) => x.toString())),
        c: c.map((x) => x.toString()),
        publicInputs: publicInputs.map((x) => x.toString()),
        publicInputsValid: publicInputs[0].toString(),
        buyer,
        seller,
        amountBaseWei: amountBaseWei.toString(),
        amountQuoteWei: amountQuoteWei.toString(),
        contractAddress: DARKPOOL_ADDRESS_TOKEN,
      });

      console.log("Sending transaction to MetaMask...");

      const hash = await writeContractAsync({
        address: DARKPOOL_ADDRESS_TOKEN as `0x${string}`,
        abi: DARKPOOL_ADDRESS_ABI,
        functionName: "settleTrade",
        args: [
          a,
          b,
          c,
          publicInputs,
          buyer,
          seller,
          amountBaseWei,
          amountQuoteWei,
        ],
      });

      // Wait for settlement to be confirmed on-chain
      await waitForReceipt(hash, "SettleTrade");

      console.log("settleTrade confirmed:", hash);
      return hash;
    } catch (error) {
      console.error("settleTrade error:", error);
      throw error;
    }
  };

  return {
    settleTrade,
    approveToken,
    baseTokenAddress,
    quoteTokenAddress,
    isPending: isWritePending,
  };
}

/**
 * Hook to wait for transaction confirmation
 */
export function useWaitForTx(hash?: `0x${string}`) {
  return useWaitForTransactionReceipt({ hash });
}
