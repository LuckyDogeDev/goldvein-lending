// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@luckyfinance/alpine-sdk/contracts/IStrategy.sol";
import "@luckyfinance/alpine-sdk/contracts/IFlashBorrower.sol";
import "@luckyfinance/alpine-sdk/contracts/IAlpineV1.sol";
import "@luckyfinance/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@luckyfinance/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../GoldVeinPair.sol";
import "../GoldVeinPairHelper.sol";
import "../interfaces/ISwapper.sol";

// solhint-disable not-rely-on-time

contract FlashloanStrategyMock is IStrategy, IFlashBorrower, GoldVeinPairHelper {
    using BoringMath for uint256;
    using BoringERC20 for IERC20;

    IERC20 private immutable assetToken;
    IERC20 private immutable collateralToken;
    GoldVeinPair private immutable goldveinPair;
    IAlpineV1 private immutable alPine;
    ISwapper private immutable swapper;
    address private immutable target;
    IUniswapV2Factory public factory;

    modifier onlyAlpine() {
        require(msg.sender == address(alPine), "only alPine");
        _;
    }

    constructor(
        IAlpineV1 alPine_,
        GoldVeinPair _goldveinPair,
        IERC20 asset,
        IERC20 collateral,
        ISwapper _swapper,
        IUniswapV2Factory _factory
    ) public {
        alPine = alPine_;
        goldveinPair = _goldveinPair;
        assetToken = asset;
        collateralToken = collateral;
        swapper = _swapper;
        factory = _factory;
        target = msg.sender;
    }

    // Send the assets to the Strategy and call skim to invest them
    function skim(uint256) external override onlyAlpine {
        // Leave the tokens on the contract
        return;
    }

    // Harvest any profits made converted to the asset and pass them to the caller
    function harvest(uint256 balance, address) external override onlyAlpine returns (int256 amountAdded) {
        // flashloan everything we can
        uint256 flashAmount = assetToken.balanceOf(address(alPine));
        alPine.flashLoan(IFlashBorrower(this), address(this), assetToken, flashAmount, new bytes(0));

        // Profit is any leftover after the flashloan and liquidation succeeded
        amountAdded = int256(assetToken.balanceOf(address(this)).sub(balance));
        assetToken.safeTransfer(address(alPine), uint256(amountAdded));
    }

    // Withdraw assets. The returned amount can differ from the requested amount due to rounding or if the request was more than there is.
    function withdraw(uint256 amount) external override onlyAlpine returns (uint256 actualAmount) {
        assetToken.safeTransfer(address(alPine), uint256(amount));
        actualAmount = amount;
    }

    // Withdraw all assets in the safest way possible. This shouldn't fail.
    function exit(uint256 balance) external override onlyAlpine returns (int256 amountAdded) {
        amountAdded = 0;
        assetToken.safeTransfer(address(alPine), balance);
    }

    // Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // liquidate
    function onFlashLoan(
        address, /*sender*/
        IERC20 token,
        uint256 amount,
        uint256 fee,
        bytes calldata /*data*/
    ) external override onlyAlpine {
        require(token == assetToken);

        // approve goldveinPair
        alPine.setMasterContractApproval(address(this), address(goldveinPair.masterContract()), true, 0, 0, 0);
        // approve & deposit asset into alPine
        assetToken.approve(address(alPine), amount);
        alPine.deposit(assetToken, address(this), address(this), amount, 0);

        // update exchange rate first
        goldveinPair.updateExchangeRate();
        // calculate how much we can liquidate
        uint256 PREC = 1e5;
        uint256 targetBorrowPart = goldveinPair.userBorrowPart(target);
        // round up
        uint256 divisor =
            (GoldVeinPairHelper.getCollateralSharesForBorrowPart(goldveinPair, targetBorrowPart) * PREC) / (goldveinPair.userCollateralShare(target)) + 1;
        // setup
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = target;
        amounts[0] = (targetBorrowPart * PREC) / divisor;

        // get rid of some assets and receive collateral
        goldveinPair.liquidate(users, amounts, address(this), ISwapper(address(0)), true);

        // swap the collateral to asset
        IUniswapV2Pair pair = IUniswapV2Pair(factory.getPair(address(collateralToken), address(assetToken)));
        // withdraw collateral to uniswap
        (uint256 amountFrom, ) =
            alPine.withdraw(collateralToken, address(this), address(pair), 0, alPine.balanceOf(collateralToken, address(this)));
        // withdraw remaining assets
        alPine.withdraw(assetToken, address(this), address(this), 0, alPine.balanceOf(assetToken, address(this)));

        {
            // swap
            (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
            if (pair.token0() == address(collateralToken)) {
                uint256 amountTo = getAmountOut(amountFrom, reserve0, reserve1);
                pair.swap(0, amountTo, address(this), new bytes(0));
            } else {
                uint256 amountTo = getAmountOut(amountFrom, reserve1, reserve0);
                pair.swap(amountTo, 0, address(this), new bytes(0));
            }
        }

        // transfer flashloan + fee back to alPine
        assetToken.safeTransfer(msg.sender, amount.add(fee));
    }
}
