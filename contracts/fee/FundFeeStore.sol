// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {AcUpgradable} from "../ac/AcUpgradable.sol";
import {FundingRateCalculator} from "./lib/FundingRateCalculator.sol";

import {IFeeVault} from "./interfaces/IFeeVault.sol";

abstract contract FundFeeStore is AcUpgradable {
    uint256 public constant FEERATEPRECISION =
        FundingRateCalculator.ONE_WITH_8_DECIMALS;

    address public feeVault;
    address public marketReader;

    // market's collect interval
    mapping(address => uint256) public fundingIntervals;
    uint256[] public configs;
    // market's cal interval
    mapping(address => uint256) public calIntervals;
    mapping(address => uint256) public lastCalTimes;
    mapping(address => mapping(bool => int256)) public calFundingRates;
    mapping(address => uint256) public fundFeeLoss;
    mapping(address => mapping(bool => uint256)) public lastCalRate;
    mapping(address => mapping(bool => int256)) public nextFundingRate;

    //======================================================
    event UpdateFundInterval(address indexed market, uint256 interval);
    event UpdateCalInterval(address indexed market, uint256 interval);
    event AddSkipTime(uint256 indexed startTime, uint256 indexed endTime);
    event UpdateConfig(uint256 index, uint256 oldFRate, uint256 newFRate);

    function initialize(address _feeVault) external initializer {
        require(_feeVault != address(0), "invalid feeVault");
        AcUpgradable._initialize(msg.sender);
        configs = new uint256[](200);
        configs[
            uint256(FundingRateCalculator.CfgIdx.MaxFRatePerDay)
        ] = FundingRateCalculator.ONE_WITH_8_DECIMALS;
        configs[
            uint256(FundingRateCalculator.CfgIdx.FRateFactor)
        ] = FundingRateCalculator.ONE_WITH_8_DECIMALS;
        configs[uint256(FundingRateCalculator.CfgIdx.MinFRate)] = 1250;
        feeVault = _feeVault;
        _grantRole(MANAGER_ROLE, msg.sender);
        _setConfig(
            uint256(FundingRateCalculator.CfgIdx.MinFundingInterval),
            FundingRateCalculator.MIN_FUNDING_INTERVAL_3600
        );

        _setConfig(
            uint256(FundingRateCalculator.CfgIdx.FundingFeeLossOffLimit),
            10 * 7
        );
    }

    function setConfig(uint256 _idx, uint256 _val) external onlyManager {
        _setConfig(_idx, _val);
    }

    function _setConfig(uint256 _idx, uint256 _val) internal {
        uint256 oldVal = configs[_idx];
        configs[_idx] = _val;
        emit UpdateConfig(_idx, oldVal, _val);
    }

    function setConfigs(uint256[] memory _newCfgs) external onlyManager {
        require(
            _newCfgs.length == uint256(FundingRateCalculator.CfgIdx.Counter)
        );
        for (uint i = 0; i < _newCfgs.length; i++) {
            _setConfig(i, _newCfgs[i]);
        }
    }

    function setMaxFRate(uint256 x) external onlyManager {
        _setConfig(uint256(FundingRateCalculator.CfgIdx.MaxFRate), x);
    }

    function maxFRate() public view returns (uint256) {
        return configs[uint256(FundingRateCalculator.CfgIdx.MaxFRate)];
    }

    function setFRateFactor(uint256 x) external onlyManager {
        _setConfig(uint256(FundingRateCalculator.CfgIdx.FRateFactor), x);
    }

    function fRateFactor() public view returns (uint256) {
        return configs[uint256(FundingRateCalculator.CfgIdx.FRateFactor)];
    }

    function setMaxFRatePerDay(uint256 x) external onlyManager {
        _setConfig(uint256(FundingRateCalculator.CfgIdx.MaxFRatePerDay), x);
    }

    function maxFRatePerDay() public view returns (uint256) {
        return configs[uint256(FundingRateCalculator.CfgIdx.MaxFRatePerDay)];
    }

    function setMarketReader(address _marketReader) external onlyManager {
        marketReader = _marketReader;
    }

    function setMinFundingInterval(uint256 x) external onlyManager {
        _setConfig(uint256(FundingRateCalculator.CfgIdx.MinFundingInterval), x);
    }

    function minFundingInterval() public view returns (uint256) {
        return
            configs[uint256(FundingRateCalculator.CfgIdx.MinFundingInterval)];
    }

    // call this func to change to 8 hours
    function setFundingInterval(
        address[] memory markets,
        uint256[] memory intervals
    ) external onlyManager {
        require(markets.length == intervals.length, "invalid params");

        uint256 interval;

        for (uint256 i = 0; i < markets.length; i++) {
            require(markets[i] != address(0));
            require(intervals[i] >= minFundingInterval());

            interval =
                (intervals[i] / minFundingInterval()) *
                minFundingInterval();
            fundingIntervals[markets[i]] = interval;

            emit UpdateFundInterval(markets[i], interval);
        }
    }

    function setCalInterval(
        address[] memory markets,
        uint256[] memory intervals
    ) external onlyManager {
        require(markets.length == intervals.length, "invalid params");
        uint256 interval;
        for (uint256 i = 0; i < markets.length; i++) {
            require(markets[i] != address(0));
            require(intervals[i] >= minFundingInterval());

            interval =
                (intervals[i] / minFundingInterval()) *
                minFundingInterval();
            calIntervals[markets[i]] = interval;
            emit UpdateCalInterval(markets[i], interval);
        }
    }

    /**
     * @dev Adds a skip time interval during which certain operations are skipped.
     * @param start The start timestamp of the skip time interval.
     * @param end The end timestamp of the skip time interval.
     */
    function addSkipTime(uint256 start, uint256 end) external onlyManager {
        configs[uint256(FundingRateCalculator.CfgIdx.Skiptime)] += (end -
            start);
        emit AddSkipTime(start, end);
    }

    /**
     * @dev Retrieves the total skip times accumulated based on the current timestamp and skip times array.
     * @return totalSkip The total skip times accumulated.
     */
    function getSkipTime() public view returns (uint256 totalSkip) {
        return configs[uint256(FundingRateCalculator.CfgIdx.Skiptime)];
    }

    function setMinFRate(uint256 limit) external onlyManager {
        require(limit > 0, "invalid limit");
        _setConfig(uint256(FundingRateCalculator.CfgIdx.MinFRate), limit);
    }

    function minFRate() public view returns (uint256) {
        return configs[uint256(FundingRateCalculator.CfgIdx.MinFRate)];
    }

    function setMinCFRate(uint256 limit) external onlyManager {
        _setConfig(uint256(FundingRateCalculator.CfgIdx.MinCFRate), limit);
    }

    function minCFRate() public view returns (uint256) {
        return configs[uint256(FundingRateCalculator.CfgIdx.MinCFRate)];
    }

    function setFundingFeeLossOffLimit(uint256 limit) external onlyManager {
        _setConfig(
            uint256(FundingRateCalculator.CfgIdx.FundingFeeLossOffLimit),
            limit
        );
    }

    function fundingFeeLossOffLimit() public view returns (uint256) {
        return
            configs[
                uint256(FundingRateCalculator.CfgIdx.FundingFeeLossOffLimit)
            ];
    }

    function addFeeLoss(address market, uint256 a) external onlyController {
        FundingRateCalculator.addNegativeFeeLoss(market, a, fundFeeLoss);
    }

    function fundingFeeLoss(address market) public view returns (uint256) {
        return fundFeeLoss[market];
    }

    function setMinorityFRate(uint256 limit) external onlyManager {
        _setConfig(uint256(FundingRateCalculator.CfgIdx.MinorityFRate), limit);
    }

    function minorityFRate() public view returns (uint256) {
        return configs[uint256(FundingRateCalculator.CfgIdx.MinorityFRate)];
    }

    /**
     * @dev Retrieves the funding rate for a market based on the sizes of long and short positions.
     * @param market The address of the market.
     * @param isLong Flag indicating whether the position is long.
     * @return The funding rate.
     */
    function getFundingRate(
        address market,
        bool isLong
    ) external view returns (int256) {
        return IFeeVault(feeVault).fundingRates(market, isLong);
    }

    /**
     * @dev Retrieves the current timestamp.
     * @return The current timestamp.
     */
    function _getTimeStamp() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}
