// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract PositionBookMock {
    int256 public globalPnl = 1000 * 10 ** 6;

    function getGlobalPnl() public view returns (int256) {
        return globalPnl;
    }

    function setPnl(int256 pnl) public {
        globalPnl = pnl;
    }


     function increasePosition(
        address _account,
        uint256 _collateralDelta,
        uint256 _sizeDelta,
        uint256 _markPrice,
        int256 _fr,
        bool _isLong
    ) external {

    }
}
