// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@luckyfinance/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@luckyfinance/core/contracts/uniswapv2/UniswapV2Factory.sol";

contract LuckySwapFactoryMock is UniswapV2Factory {
    constructor() public UniswapV2Factory(msg.sender) {
        return;
    }
}
