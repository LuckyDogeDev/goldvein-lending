// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@luckyfinance/core/contracts/uniswapv2/UniswapV2Pair.sol";

contract LuckySwapPairMock is UniswapV2Pair {
    constructor() public UniswapV2Pair() {
        return;
    }
}
