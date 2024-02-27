// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

interface IGlobalValid {
    struct ValidParams {
        address market;
        uint256 sizeDelta;
        bool isLong;
        uint256 globalLongSizes;
        uint256 globalShortSizes;
        uint256 userLongSizes;
        uint256 userShortSizes;
        uint256 marketLongSizes;
        uint256 marketShortSizes;
        uint256 aum;
    }

    function BASIS_POINTS_DIVISOR() external view returns (uint256);

    function maxSizeLimit() external view returns (uint256);

    function maxNetSizeLimit() external view returns (uint256);

    function maxUserNetSizeLimit() external view returns (uint256);

    function maxMarketSizeLimit(address market) external view returns (uint256);

    function setMaxSizeLimit(uint256 limit) external;

    function setMaxNetSizeLimit(uint256 limit) external;

    function setMaxUserNetSizeLimit(uint256 limit) external;

    function setMaxMarketSizeLimit(address market, uint256 limit) external;

    function isIncreasePosition(
        ValidParams memory params
    ) external view returns (bool);

    function getMaxIncreasePositionSize(
        ValidParams memory params
    ) external view returns (uint256);
}
