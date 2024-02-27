// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

interface IFundFee {
    function MIN_FUNDING_INTERVAL() external view returns (uint256);

    function FEE_RATE_PRECISION() external view returns (uint256);

    function BASIS_INTERVAL_HOU() external view returns (uint256);

    function DEFAULT_RATE_DIVISOR() external view returns (uint256);

    function minRateLimit() external view returns (uint256);

    function feeStore() external view returns (address);

    function fundingIntervals(address) external view returns (uint256);

    function initialize(address store) external;

    function setMinRateLimit(uint256 limit) external;

    function setFundingInterval(
        address[] memory markets,
        uint256[] memory intervals
    ) external;

    function addSkipTime(uint256 start, uint256 end) external;

    function addFeeLoss(address, uint256 a) external;

    function updateCumulativeFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize
    ) external;

    function getFundingRate(
        address market,
        bool isLong
    ) external view returns (int256);

    function getFundingFee(
        address market,
        uint256 size,
        int256 entryFundingRate,
        bool isLong
    ) external view returns (int256);

    function getNextFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize
    ) external view returns (int256, int256);

    function fundFeeLoss(address) external view returns (uint256);

    function setTimeStamp(uint256 ts) external;

    function lastCalRate(
        address market,
        bool isLong
    ) external view returns (uint256);

    function nextFundingRate(
        address,
        bool
    ) external view returns (int256, int256);
}
