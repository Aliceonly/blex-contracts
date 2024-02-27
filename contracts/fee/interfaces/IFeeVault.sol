// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

interface IFeeVault {
    function cumulativeFundingRates(
        address market,
        bool isLong
    ) external view returns (int256);

    function fundingRates(
        address market,
        bool isLong
    ) external view returns (int256);

    function lastFundingTimes(address market) external view returns (uint256);

    function updateGlobalFundingRate(
        address market,
        int256 longRate,
        int256 shortRate,
        int256 nextLongRate,
        int256 nextShortRate,
        uint256 timestamp
    ) external;

    function withdraw(address token, address to, uint256 amount) external;
}
