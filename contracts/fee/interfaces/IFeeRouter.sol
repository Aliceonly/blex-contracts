// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {MarketDataTypes} from "../../market/MarketDataTypes.sol";
import {Position} from "../../position/PositionStruct.sol";

interface IFeeRouter {
    function feeVault() external view returns (address);

    function fundFee() external view returns (address);

    function FEE_RATE_PRECISION() external view returns (uint256);

    function feeAndRates(
        address market,
        uint8 kind
    ) external view returns (uint256);

    function initialize(address vault, address fundingFee) external;

    function setFeeAndRates(address market, uint256[] memory rates) external;

    function withdraw(address token, address to, uint256 amount) external;

    function getExecFee(address market) external view returns (uint256);

    function getFundingRate(
        address market,
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

    function getOrderFees(
        MarketDataTypes.UpdateOrderInputs memory params
    ) external view returns (int256 fees);

    function getFees(
        MarketDataTypes.UpdatePositionInputs memory params,
        Position.Props memory position
    ) external view returns (int256[] memory);

    function collectFees(
        address account,
        address token,
        int256[] memory originFees
    ) external;

    function collectFees(
        address account,
        address token,
        int256[] memory fees,
        uint256 fundfeeLoss
    ) external;

    function payoutFees(
        address account,
        address token,
        int256[] memory fees,
        uint256 feesTotal
    ) external;
}
