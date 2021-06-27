// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@luckyfinance/alpine-sdk/contracts/IStrategy.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// solhint-disable not-rely-on-time

contract SimpleStrategyMock is IStrategy {
    using BoringMath for uint256;
    using BoringERC20 for IERC20;

    IERC20 private immutable token;
    address private immutable alPine;

    modifier onlyAlpine() {
        require(msg.sender == alPine, "Ownable: caller is not the owner");
        _;
    }

    constructor(address alPine_, IERC20 token_) public {
        alPine = alPine_;
        token = token_;
    }

    // Send the assets to the Strategy and call skim to invest them
    function skim(uint256) external override onlyAlpine {
        // Leave the tokens on the contract
        return;
    }

    // Harvest any profits made converted to the asset and pass them to the caller
    function harvest(uint256 balance, address) external override onlyAlpine returns (int256 amountAdded) {
        amountAdded = int256(token.balanceOf(address(this)).sub(balance));
        token.safeTransfer(alPine, uint256(amountAdded)); // Add as profit
    }

    // Withdraw assets. The returned amount can differ from the requested amount due to rounding or if the request was more than there is.
    function withdraw(uint256 amount) external override onlyAlpine returns (uint256 actualAmount) {
        token.safeTransfer(alPine, uint256(amount)); // Add as profit
        actualAmount = amount;
    }

    // Withdraw all assets in the safest way possible. This shouldn't fail.
    function exit(uint256 balance) external override onlyAlpine returns (int256 amountAdded) {
        amountAdded = 0;
        token.safeTransfer(alPine, balance);
    }
}
