// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../ac/Ac.sol";

contract FeeVault is Ac {
    using SafeERC20 for IERC20;

    // cumulativeFundingRates tracks the funding rates based on utilization
    mapping(address => mapping(bool => int256)) public cumulativeFundingRates;
    // fundingRates tracks the funding rates based on position size
    mapping(address => mapping(bool => int256)) public fundingRates;
    // lastFundingTimes tracks the last time funding was updated for a token
    mapping(address => uint256) public lastFundingTimes;

    event Withdraw(address indexed token, address indexed to, uint256 amount);
    event UpdateCumulativeFundRate(
        address indexed market,
        int256 longRate,
        int256 shortRate
    );
    event UpdateFundRate(
        address indexed market,
        int256 longRate,
        int256 shortRate
    );
    event UpdateLastFundTime(address indexed market, uint256 timestamp);

    constructor() Ac(msg.sender) {}

    /**
     * @dev Allows an authorized role to withdraw tokens to a specified address.
     * @param token The address of the token to be withdrawn.
     * @param to The address to which the tokens will be transferred.
     * @param amount The amount of tokens to be withdrawn.
     */
    function withdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(WITHDRAW_ROLE) {
        IERC20(token).safeTransfer(to, amount);
        emit Withdraw(token, to, amount);
    }


    /**
     * @dev Updates the global funding rates for a market.
     * @param market The address of the market.
     * @param longRate The current long funding rate.
     * @param shortRate The current short funding rate.
     * @param nextLongRate The next long funding rate.
     * @param nextShortRate The next short funding rate.
     * @param timestamp The timestamp of the update.
     */
    function updateGlobalFundingRate(
        address market,
        int256 longRate,
        int256 shortRate,
        int256 nextLongRate,
        int256 nextShortRate,
        uint256 timestamp
    ) external onlyController {
        require(market != address(0), "!zero address");

        cumulativeFundingRates[market][true] += nextLongRate;
        fundingRates[market][true] = longRate;

        cumulativeFundingRates[market][false] += nextShortRate;
        fundingRates[market][false] = shortRate;

        lastFundingTimes[market] = timestamp;

        emit UpdateCumulativeFundRate(market, nextLongRate, nextShortRate);
        emit UpdateFundRate(market, longRate, shortRate);
        emit UpdateLastFundTime(market, timestamp);
    }
}
