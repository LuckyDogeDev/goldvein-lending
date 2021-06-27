// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import "@luckyfinance/alpine-sdk/contracts/IAlpineV1.sol";
import "./GoldVeinPair.sol";

/// @dev This contract provides useful helper functions for `GoldVeinPair`.
contract GoldVeinPairHelper {
    using BoringMath for uint256;
    using BoringMath128 for uint128;
    using RebaseLibrary for Rebase;

    /// @dev Helper function to calculate the collateral shares that are needed for `borrowPart`,
    /// taking the current exchange rate into account.
    function getCollateralSharesForBorrowPart(GoldVeinPair goldveinPair, uint256 borrowPart) public view returns (uint256) {
        // Taken from GoldVeinPair
        uint256 EXCHANGE_RATE_PRECISION = 1e18;
        uint256 LIQUIDATION_MULTIPLIER = 112000; // add 12%
        uint256 LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

        (uint128 elastic, uint128 base) = goldveinPair.totalBorrow();
        Rebase memory totalBorrow = Rebase(elastic, base);
        uint256 borrowAmount = totalBorrow.toElastic(borrowPart, false);

        return
            goldveinPair.alPine().toShare(
                goldveinPair.collateral(),
                borrowAmount.mul(LIQUIDATION_MULTIPLIER).mul(goldveinPair.exchangeRate()) /
                    (LIQUIDATION_MULTIPLIER_PRECISION * EXCHANGE_RATE_PRECISION),
                false
            );
    }
}
