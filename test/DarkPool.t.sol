// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/DarkPool.sol";
import "../contracts/MockERC20.sol";
import {Groth16Verifier as Verifier} from "../contracts/Verifier.sol";

contract DarkPoolTest is Test {
    DarkPool darkPool;
    MockERC20 baseToken;
    MockERC20 quoteToken;
    Verifier verifier;

    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");

    function setUp() public {
        baseToken = new MockERC20("MockWETH", "MWETH");
        quoteToken = new MockERC20("MockUSDC", "MUSDC");

        verifier = new Verifier(); // Gunakan real Verifier dari snarkjs

        darkPool = new DarkPool(
            address(verifier),
            address(baseToken),
            address(quoteToken)
        );

        // Mint & approve
        baseToken.mint(seller, 10 ether);
        quoteToken.mint(buyer, 10 ether); // Mint enough quote tokens in 18 decimals

        vm.prank(seller);
        baseToken.approve(address(darkPool), type(uint256).max);

        vm.prank(buyer);
        quoteToken.approve(address(darkPool), type(uint256).max);
    }

    function testSettleTradeWithRealProof() public {
        // Proof dari build/proof_fixed.json - valid proof with correct inputs
        uint[2] memory a = [
            uint256(
                4836159505526990582538509534892181344160936626589017889824829313864036696490
            ),
            uint256(
                20011399436326487203191304253353698521474742879148847247770164580456121094046
            )
        ];

        uint[2][2] memory b = [
            [
                uint256(
                    10589654559151141156672731866819006150727498802624810361797557152944133932566
                ),
                uint256(
                    2853344250067730885160092073218634205155720151599084202464708987000611330443
                )
            ],
            [
                uint256(
                    9531336809913678535417347894036460333860635240604488008089263111901092090466
                ),
                uint256(
                    19154692497236317570922574809997144804442466274839491529997007926784081436489
                )
            ]
        ];

        uint[2] memory c = [
            uint256(
                4723316372945933303215152905454171445532336210821453379898345076861913496125
            ),
            uint256(
                10772714122068466512872439327253117734328524599626407090568226472131096006153
            )
        ];

        // Public inputs: EXACT order from build/public_fixed.json
        // [valid, amountBase, amountQuote, midpointPrice, toleranceBps]
        uint256[5] memory publicInputs = [
            uint256(1), // valid (circuit output)
            uint256(100000000000000000), // amountBase (0.1 ether)
            uint256(300000000000000000), // amountQuote (0.3 ether)
            uint256(3), // midpointPrice (scalar: 3)
            uint256(100) // toleranceBps (1%)
        ];

        // Call settleTrade with matching values
        vm.prank(seller);
        darkPool.settleTrade(
            a,
            b,
            c,
            publicInputs,
            buyer,
            seller,
            100000000000000000, // amountBase (must match public[1])
            300000000000000000 // amountQuote (must match public[2])
        );

        // Assert transfers succeeded
        assertEq(baseToken.balanceOf(buyer), 100000000000000000);
        assertEq(quoteToken.balanceOf(seller), 300000000000000000);
    }
}
