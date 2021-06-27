// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@luckyfinance/alpine-sdk/contracts/IAlpineV1.sol";
import "../GoldVeinPair.sol";

contract GoldVeinPairMock is GoldVeinPair {
    constructor(IAlpineV1 alPine) public GoldVeinPair(alPine) {
        return;
    }

    function accrueTwice() public {
        accrue();
        accrue();
    }
}
