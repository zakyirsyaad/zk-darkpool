"use client";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseUnits } from "viem";
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
  amountBase: string; // Amount in token units (e.g., "0.1" for 0.1 ETH)
  amountQuote: string; // Amount in quote units (e.g., "300" for 300 USDC)
  ticker: string; // e.g., "ETHUSDT"
  buyer: `0x${string}`;
  seller: `0x${string}`;
}

/**
 * Generate ZK proof from backend matcher
 */
export async function generateProof(
  amountBase: number,
  amountQuote: number,
  ticker: string
): Promise<ProofResponse> {
  const res = await fetch(`${API_BASE_URL}/match-and-settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountBase, amountQuote, ticker }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate proof");
  }

  return res.json();
}

/**
 * Hook for DarkPool contract interactions
 */
export function useDarkPool() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

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
   * Approve token spending for DarkPool contract
   */
  const approveToken = async (tokenAddress: `0x${string}`, amount: bigint) => {
    return writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [DARKPOOL_ADDRESS_TOKEN as `0x${string}`, amount],
    });
  };

  /**
   * Settle trade on-chain with ZK proof
   */
  const settleTrade = async (
    params: SettleTradeParams & { proof: ProofResponse }
  ) => {
    const { proof, buyer, seller, amountBase, amountQuote } = params;

    console.log("settleTrade called with:", {
      proof,
      buyer,
      seller,
      amountBase,
      amountQuote,
    });

    try {
      // Backend now uses snarkjs.groth16.exportSolidityCallData which returns
      // values in the correct format for Ethereum (hex strings with proper G2 swapping)
      // a is [2] array
      const a: [bigint, bigint] = [BigInt(proof.a[0]), BigInt(proof.a[1])];

      // b is [2][2] array - already in correct format from exportSolidityCallData
      const b: [[bigint, bigint], [bigint, bigint]] = [
        [BigInt(proof.b[0][0]), BigInt(proof.b[0][1])],
        [BigInt(proof.b[1][0]), BigInt(proof.b[1][1])],
      ];

      // c is [2] array
      const c: [bigint, bigint] = [BigInt(proof.c[0]), BigInt(proof.c[1])];

      // publicInputs is [5] array
      const publicInputs: [bigint, bigint, bigint, bigint, bigint] = [
        BigInt(proof.publicInputs[0]),
        BigInt(proof.publicInputs[1]),
        BigInt(proof.publicInputs[2]),
        BigInt(proof.publicInputs[3]),
        BigInt(proof.publicInputs[4]),
      ];

      // Convert amounts to wei (18 decimals)
      const amountBaseWei = parseUnits(amountBase, 18);
      const amountQuoteWei = parseUnits(amountQuote, 18);

      console.log("Calling settleTrade with args:", {
        a: a.map((x) => x.toString()),
        b: b.map((row) => row.map((x) => x.toString())),
        c: c.map((x) => x.toString()),
        publicInputs: publicInputs.map((x) => x.toString()),
        publicInputsValid: publicInputs[0].toString(), // Should be "1" for valid
        buyer,
        seller,
        amountBaseWei: amountBaseWei.toString(),
        amountQuoteWei: amountQuoteWei.toString(),
        contractAddress: DARKPOOL_ADDRESS_TOKEN,
      });

      console.log("Sending transaction to MetaMask...");

      const result = await writeContractAsync({
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

      console.log("settleTrade result:", result);
      return result;
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
