// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

interface IFeeRouter {
    enum FeeType {
        OpenFee,
        CloseFee,
        FundFee,
        ExecFee,
        LiqFee,
        BuyLpFee,
        SellLpFee,
        Counter
    }

    function feeVault() external view returns (address);

    function fundFee() external view returns (address);

    function FEE_RATE_PRECISION() external view returns (uint256);

    function feeAndRates(
        address market,
        uint8 kind
    ) external view returns (uint256);

    function initialize(address vault, address fundingFee) external;

    function setFeeAndRates(
        address market,
        uint8[] memory kinds,
        uint256[] memory rates
    ) external;

    function withdraw(address token, address to, uint256 amount) external;

    function getExecFee(address market) external view returns (uint256);

    function getFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize,
        bool isLong
    ) external view returns (int256);

    function cumulativeFundingRates(
        address market,
        bool isLong
    ) external view returns (int256);

    function updateCumulativeFundingRate(
        address market,
        uint256 longSize,
        uint256 shortSize
    ) external;

    function collectFees(
        address account,
        address token,
        uint8[] memory types,
        int256[] memory fees
    ) external;
}
