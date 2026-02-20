export const DARKPOOL_ADDRESS_TOKEN =
  "0x01b25b632E6c97817D47E600A5442aa828C1bca4";

// Minimal ABI for demo (extend as needed)
export const DARKPOOL_ADDRESS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_verifier", type: "address" },
      { internalType: "address", name: "_baseToken", type: "address" },
      { internalType: "address", name: "_quoteToken", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "seller",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountBase",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountQuote",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "midpointPrice",
        type: "uint256",
      },
    ],
    name: "TradeSettled",
    type: "event",
  },
  {
    inputs: [
      { internalType: "contract IERC20", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approveToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "baseToken",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "quoteToken",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[2]", name: "a", type: "uint256[2]" },
      { internalType: "uint256[2][2]", name: "b", type: "uint256[2][2]" },
      { internalType: "uint256[2]", name: "c", type: "uint256[2]" },
      { internalType: "uint256[5]", name: "publicInputs", type: "uint256[5]" },
      { internalType: "address", name: "buyer", type: "address" },
      { internalType: "address", name: "seller", type: "address" },
      { internalType: "uint256", name: "amountBase", type: "uint256" },
      { internalType: "uint256", name: "amountQuote", type: "uint256" },
    ],
    name: "settleTrade",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "verifier",
    outputs: [
      { internalType: "contract Groth16Verifier", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
];
