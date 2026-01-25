// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Groth16Verifier as Verifier} from "./Verifier.sol";

contract DarkPool {
    Verifier public immutable verifier;

    IERC20 public immutable baseToken; // Misal MockWETH
    IERC20 public immutable quoteToken; // Misal MockUSDC

    event TradeSettled(
        address indexed buyer,
        address indexed seller,
        uint256 amountBase,
        uint256 amountQuote,
        uint256 midpointPrice
    );

    constructor(address _verifier, address _baseToken, address _quoteToken) {
        verifier = Verifier(_verifier);
        baseToken = IERC20(_baseToken);
        quoteToken = IERC20(_quoteToken);
    }

    /**
     * @notice Settle private trade setelah ZK proof valid
     * @param a Proof component A [uint[2]]
     * @param b Proof component B [uint[2][2]]
     * @param c Proof component C [uint[2]]
     * @param publicInputs Public inputs dari circuit [midpointPrice, toleranceBps, amountBase, amountQuote]
     * @param buyer Alamat pembeli (quote payer, base receiver)
     * @param seller Alamat penjual (base payer, quote receiver)
     * @param amountBase Jumlah base token (public dari circuit)
     * @param amountQuote Jumlah quote token (public dari circuit)
     */
    function settleTrade(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[5] calldata publicInputs, // Public inputs sesuai circuit (5 inputs)
        address buyer,
        address seller,
        uint256 amountBase,
        uint256 amountQuote
    ) external {
        // Verifikasi ZK proof
        bool isValid = verifier.verifyProof(a, b, c, publicInputs);
        require(isValid, "Invalid ZK proof");

        // Transfer token (settlement)
        require(
            baseToken.transferFrom(seller, buyer, amountBase),
            "Base token transfer failed"
        );
        require(
            quoteToken.transferFrom(buyer, seller, amountQuote),
            "Quote token transfer failed"
        );

        emit TradeSettled(
            buyer,
            seller,
            amountBase,
            amountQuote,
            publicInputs[0]
        ); // midpointPrice
    }

    // Helper: Approve token ke contract (untuk test)
    function approveToken(IERC20 token, uint256 amount) external {
        token.approve(address(this), amount);
    }
}
