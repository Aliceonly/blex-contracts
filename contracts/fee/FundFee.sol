// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {AcUpgradable} from "../ac/AcUpgradable.sol";
import {IFeeVault} from "./interfaces/IFeeVault.sol";
import {IMarketReader} from "../market/interfaces/IMarketReader.sol";
import {IMarketFactory} from "../market/interfaces/IMarketFactory.sol";
import "./../position/PositionStruct.sol";
import "./FundFeeStore.sol";

contract FundFee is FundFeeStore {
    using SafeCast for uint256;
    using SafeCast for int256;

    // Temporary cumulative funding rate change value
    function getCalFundingRates(
        address market
    ) public view returns (int256, int256) {
        return (calFundingRates[market][true], calFundingRates[market][false]);
    }

    function _updateCalFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize,
        uint256 calcPart // 1 or 2
    ) private {
        FundingRateCalculator.updateCalFundingRate(
            FundingRateCalculator.UpdateCalFundingRateCache(
                market,
                longSize,
                shortSize,
                calcPart,
                _getCalInterval(market),
                _getCollectInterval(market),
                _getTimeStamp(),
                _getMaxFRate(market),
                _calFeeRate(market, longSize, shortSize)
            ),
            calFundingRates,
            lastCalTimes,
            configs,
            lastCalRate
        );
    }

    struct UpdateCumulativeFundingRateCache {
        uint256 fundingInterval;
        uint256 roundedTime;
        uint256 currentTimeStamp;
        int256 collectInterval;
        int256 longCumCFRateDelta;
        int256 shortCumCFRateDelta;
        int256 longRate;
        int256 shortRate;
    }

    /**
     * @dev Called by the market.
     * Updates the cumulative funding rate for a market based on the sizes of long and short positions.
     * @param market The address of the market.
     * @param longSize The size of the long position.
     * @param shortSize The size of the short position.
     */

    function updateCumulativeFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize
    ) external onlyController {
        // ==================================================================
        //                                 part1
        // ==================================================================
        (, uint256 endRoundedTime) = FundingRateCalculator._calcPart1Intervals(
            _getCalInterval(market),
            lastCalTimes[market],
            _getTimeStamp(),
            _getCollectInterval(market)
        );
        _updateCumulativeFundingRate(
            market,
            longSize,
            shortSize,
            endRoundedTime
        );

        // ==================================================================
        //                                 part2
        // ==================================================================
        (uint256 collectIntervals, ) = FundingRateCalculator
            ._calcPart2Intervals(
                _getCalInterval(market),
                lastCalTimes[market],
                _getTimeStamp(),
                _getCollectInterval(market)
            );

        for (uint i = 0; i < collectIntervals; i++) {
            _updateCumulativeFundingRate(
                market,
                longSize,
                shortSize,
                endRoundedTime + (i + 1) * _getCollectInterval(market)
            );
        }

        // ==================================================================
        //                                 part3
        // ==================================================================
        _updateCalFundingRate(market, longSize, shortSize, 3);

        (
            nextFundingRate[market][true],
            nextFundingRate[market][false]
        ) = getNextFundingRate(market, longSize, shortSize);
    }

    function _updateCumulativeFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize,
        uint256 ts
    ) internal {
        UpdateCumulativeFundingRateCache memory _cache;
        // Update the funding rate calculation
        _updateCalFundingRate(market, longSize, shortSize, 1);

        // Check if cumulative funding rate update is needed
        _cache.fundingInterval = _getCollectInterval(market);
        _cache.roundedTime = _getLastCollectTimes(market);

        _cache.currentTimeStamp = ts;
        // Initialize the state
        if (_cache.roundedTime == 0) {
            _cache.roundedTime =
                (_cache.currentTimeStamp / _cache.fundingInterval) *
                _cache.fundingInterval;
            IFeeVault(feeVault).updateGlobalFundingRate(
                market,
                0,
                0,
                0,
                0,
                _cache.roundedTime
            );
            return;
        }

        // If the time has not arrived, do not update the funding rate
        if (
            !FundingRateCalculator.isFundingTimeReached(
                _cache.roundedTime,
                _cache.fundingInterval,
                _cache.currentTimeStamp
            )
        ) return;
        (_cache.longRate, _cache.shortRate) = getCalFundingRates(market);
        uint256 CFRate = FundingRateCalculator.calCFRate(
            _cache.longRate,
            _cache.shortRate,
            minCFRate()
        );
        (
            int256 _longCFRate,
            int256 _shortCFRate,
            uint256 deductFundFeeAmount
        ) = FundingRateCalculator.calNextCFRate(
                _cache.longRate,
                _cache.shortRate,
                CFRate,
                fundingFeeLossOffLimit(),
                fundingFeeLoss(market),
                longSize,
                shortSize
            );

        _cache.collectInterval = FundingRateCalculator
            ._calculateIntervals(
                // Multiples of eight-hour intervals
                FundingRateCalculator.calcRoundedTime(
                    _cache.currentTimeStamp,
                    _cache.fundingInterval
                ), // Current rounded time
                // Last time
                _cache.roundedTime, // Last time
                // One-hour time interval
                _cache.fundingInterval // Time interval
            )
            .toInt256();
        _cache.longCumCFRateDelta = _longCFRate * _cache.collectInterval;
        _cache.shortCumCFRateDelta = _shortCFRate * _cache.collectInterval;

        FundingRateCalculator.addPositiveFeeLoss(
            market,
            deductFundFeeAmount,
            fundFeeLoss
        );

        _cache.roundedTime = FundingRateCalculator.calcRoundedTime(
            _cache.currentTimeStamp,
            _cache.fundingInterval
        );

        // Update the funding rate
        IFeeVault(feeVault).updateGlobalFundingRate(
            market,
            _longCFRate,
            _shortCFRate,
            _cache.longCumCFRateDelta,
            _cache.shortCumCFRateDelta,
            _cache.roundedTime
        );

        // If cumulative funding rate is updated
        // Reset the calculation of funding rate
        FundingRateCalculator.resetCalFundingRate(
            market,
            _cache.roundedTime,
            calFundingRates,
            lastCalTimes
        );
    }

    //==========================================================
    //          readonly
    //==========================================================

    /**
     * @dev Retrieves the next funding rates for a market based on the sizes of long and short positions.
     * @param market The address of the market.
     * @param longSize The size of the long position on single market.
     * @param shortSize The size of the short position on single market.
     * @return _longCFRate The next funding rates for long and short positions.
     * @return _shortCFRate The next funding rates for long and short positions.
     */
    function getNextFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize
    ) public view returns (int256 _longCFRate, int256 _shortCFRate) {
        FundingRateCalculator.GetNextFundingRateCache memory c;
        c.calInterval = _getCalInterval(market);
        c.lastCalTimes = lastCalTimes[market];
        c.ts = _getTimeStamp();
        c.collectInterval = _getCollectInterval(market);
        c.minCFRate = minCFRate();
        c.fundingFeeLossOffLimit = fundingFeeLossOffLimit();
        c.fundingFeeLoss = fundingFeeLoss(market);

        return
            FundingRateCalculator.getNextFundingRate(
                market,
                longSize,
                shortSize,
                c,
                calFundingRates,
                lastCalRate
            );
    }

    /**
     * @dev Retrieves the funding fee for a market based on the size, entry funding rate, and position type.
     * @param market The address of the market.
     * @param size The size of the position.
     * @param entryFundingRate The entry funding rate of the position.
     * @param isLong Flag indicating whether the position is long.
     * @return The funding fee.
     */
    function getFundingFee(
        address market,
        uint256 size,
        int256 entryFundingRate,
        bool isLong
    ) external view returns (int256) {
        int256 _cumRates = IFeeVault(feeVault).cumulativeFundingRates(
            market,
            isLong
        );
        return
            FundingRateCalculator.calUserFundingFee(
                size,
                entryFundingRate,
                _cumRates
            );
    }

    function getGlobalOpenInterest() public view returns (uint256 _globalSize) {
        IMarketReader mr = IMarketReader(marketReader);
        IMarketFactory.Outs[] memory _outs = mr.getMarkets();
        for (uint256 i; i < _outs.length; i++) {
            _globalSize += mr.vaultRouter().fundsUsed(_outs[i].addr);
        }
    }

    //==========================================================
    //          private & internal
    //==========================================================

    /**
     * @dev Retrieves the funding interval for a given market.
     * @param market The address of the market.
     * @return _interval The funding interval for the specified market, or the minimum funding interval if not set.
     */
    function _getCollectInterval(
        address market
    ) private view returns (uint256 _interval) {
        return
            FundingRateCalculator.getFundingInterval(market, fundingIntervals);
    }

    function _getCalInterval(
        address market
    ) private view returns (uint256 _interval) {
        return FundingRateCalculator.getFundingInterval(market, calIntervals);
    }

    /**
     * @dev Retrieves the last funding time for a given market from the FeeVault contract.
     * @param market The address of the market.
     * @return The last funding time for the specified market.
     */
    function _getLastCollectTimes(
        address market
    ) private view returns (uint256) {
        return IFeeVault(feeVault).lastFundingTimes(market);
    }

    function _getLastCalTimes(address market) private view returns (uint256) {
        return lastCalTimes[market];
    }

    /**
     * @dev Retrieves the funding rate for a market based on the sizes of long and short positions.
     * @param longSize The size of the long position.
     * @param shortSize The size of the short position.
     */
    function _calPendingFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize
    ) private view returns (uint256 x, uint256 y) {
        (x, y) = FundingRateCalculator.capFundingRateByLimits(
            longSize,
            shortSize,
            maxFRate(),
            minFRate(),
            _getMaxFRate(market),
            _calFeeRate(market, longSize, shortSize),
            minorityFRate()
        );
    }

    function _calFeeRate(
        address _market,
        uint256 _longSize,
        uint256 _shortSize
    ) private view returns (uint256) {
        return
            FundingRateCalculator.calFeeRate(
                _longSize,
                _shortSize,
                _getCalInterval(_market),
                fRateFactor()
            );
    }

    function _getMaxFRate(address market) private view returns (uint256) {
        // Calculate the max funding rate if maxFRate is not set
        IMarketReader mr = IMarketReader(marketReader);
        uint256 openInterest = getGlobalOpenInterest(); // 6 decimals
        uint256 aum = mr.vaultRouter().getAUM(); // 6 decimals
        uint256 fundingInterval = _getCalInterval(market);
        return
            FundingRateCalculator.calculateMaxFundingRate(
                openInterest,
                aum,
                maxFRatePerDay(),
                fundingInterval
            );
    }
}
