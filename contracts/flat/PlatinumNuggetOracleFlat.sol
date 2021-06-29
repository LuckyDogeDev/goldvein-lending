// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);
}

/// @notice A library for performing overflow-/underflow-safe math,
/// updated with awesomeness from of DappHub (https://github.com/dapphub/ds-math).
library BoringMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
        require((c = a + b) >= b, "BoringMath: Add Overflow");
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256 c) {
        require((c = a - b) <= a, "BoringMath: Underflow");
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
        require(b == 0 || (c = a * b) / b == a, "BoringMath: Mul Overflow");
    }
}

interface IAggregator {
    function latestAnswer() external view returns (int256 answer);
}

/// @title PlatinumNuggetOracle
/// @author BoringCrypto
/// @notice Oracle used for getting the price of PLAN based on Chainlink GOLN price
/// @dev
contract PlatinumNuggetOracleV1 is IAggregator {
    using BoringMath for uint256;

    IERC20 public immutable goldnugget;
    IERC20 public immutable bar;
    IAggregator public immutable goldnuggetOracle;

    constructor(
        IERC20 goldnugget_,
        IERC20 bar_,
        IAggregator goldnuggetOracle_
    ) public {
        goldnugget = goldnugget_;
        bar = bar_;
        goldnuggetOracle = goldnuggetOracle_;
    }

    // Calculates the lastest exchange rate
    // Uses goldnugget rate and PLAN conversion
    function latestAnswer() external view override returns (int256) {
        return int256(uint256(goldnuggetOracle.latestAnswer()).mul(goldnugget.balanceOf(address(bar))) / bar.totalSupply());
    }
}
