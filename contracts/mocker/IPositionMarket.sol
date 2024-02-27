// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../position/PositionStruct.sol";

interface IPositionMarket{
    function getAllMarketAddress() external view returns(address[] memory);
    function globalPositions(bytes32 key) external view returns(Position.Props memory);

    function userLongSizes(address account) external view returns (uint256);

    function userShortSizes(address account) external view returns (uint256);

    function marketLongSizes(address market) external view returns (uint256);

    function marketShortSizes(address market) external view returns (uint256);

    function globalLongSizes() external view returns (uint256);

    function globalShortSizes() external view returns (uint256);


    function increaseGlobalPosition(
        address account,
        address market,
        uint256 collateralDelta,
        uint256 sizeDelta,
        uint256 averagePrice,
        bool isLong
    ) external ;

    function decreaseGlobalPosition(
        address account,
        address market,
        uint256 collateralDelta,
        uint256 sizeDelta,
        bool isLong
    ) external ;

}