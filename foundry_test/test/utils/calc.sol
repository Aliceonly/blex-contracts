// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/Math.sol";

library  CalcCoreVault {
    using Math for uint256;

    function convertToShares(
        uint256 assets,
        uint256 supply,
        uint256 totalAssets,
        bool up
    ) external pure returns (uint256 shares) {
        if (up){
         return
            (assets == 0 || supply == 0)
                ? assets
                : assets.mulDiv(supply, totalAssets, Math.Rounding.Up);
        }else{
             return
            (assets == 0 || supply == 0)
                ? assets
                : assets.mulDiv(supply, totalAssets, Math.Rounding.Down);
        }
    }

    function convertToAssets(
        uint256 shares,
        uint256 supply,
        uint256 totalAssets,
        bool up
    )external pure returns (uint256 ){

        if (up){
             return (supply == 0)
                ? shares
                : shares.mulDiv(totalAssets, supply, Math.Rounding.Up);
        }else{
            return (supply == 0)
                ? shares
                : shares.mulDiv(totalAssets, supply, Math.Rounding.Down);
        }
    }
}
