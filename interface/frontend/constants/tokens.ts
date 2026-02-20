import { arbitrum, arbitrumSepolia, base } from "viem/chains";

// Mapping token symbol ke contract address untuk berbagai network
export const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  BTC: {
    [arbitrum.id]: "0x2f5e87c9312fa29aed5c179e456625d79015299c", // WBTC on Arbitrum
    [base.id]: "0x1ceA8427D5bE57482ef1b84B388a0b9f8a0F83dE", // WBTC on Base
  },
  ETH: {
    // Native ETH on main chains, ERC20 wrapper on Arbitrum Sepolia
    [arbitrumSepolia.id]: "0x84c95657D037646E1F80A77b0740C1fa03B8B292", // ETH token on Arbitrum Sepolia
  },
  USDC: {
    [arbitrum.id]: "0xc6962004f452be9203591991d15f6b388e09e8d0", // USDC on Arbitrum Mainnet
    [arbitrumSepolia.id]: "0xAc2132e6E9c15f2d67772678aEB3adad663C35e3", // USDC on Arbitrum Sepolia
    [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  },
  ARB: {
    [arbitrum.id]: "0xc6f780497a95e246eb9449f5e4770916dcd6396a", // ARB on Arbitrum
  },
  GMX: {
    [arbitrum.id]: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", // GMX on Arbitrum
  },
};

// Get list of available token symbols
export function getAvailableTokens(): string[] {
  return Object.keys(TOKEN_ADDRESSES).filter(
    (symbol) => symbol !== "ETH" || true,
  ); // Include ETH even though it's native
}
