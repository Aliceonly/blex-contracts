// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SignedMath.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

library Calc {
    using SignedMath for int256;

    function diff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    function abs(uint256 x, uint256 y) internal pure returns (uint256) {
        if (x >= y) return x - y;
        else return y - x;
    }

    function abs(int256 x, int256 y) internal pure returns (int256) {
        if (x >= y) return x - y;
        else return y - x;
    }

    function sum(uint256 a, int256 b) internal pure returns (uint256) {
        if (b > 0) {
            return a + b.abs();
        }

        return a - b.abs();
    }

    function sum(int256 a, uint256 b) internal pure returns (int256) {
        return a + SafeCast.toInt256(b);
    }

    function toSigned(
        uint256 a,
        bool isPositive
    ) internal pure returns (int256) {
        if (isPositive) {
            return SafeCast.toInt256(a);
        } else {
            return -SafeCast.toInt256(a);
        }
    }
}
