// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library Precision {
    uint256 public constant BASIS_POINTS_DIVISOR = 100000000;
    uint256 public constant FEE_RATE_PRECISION_DECIMALS = 8;
    uint256 public constant BOOSTER_PRICE_PRECISION_DECIMALS = 8;
    uint256 public constant VAULR_REWARD_BASE_PRECISION = 1e30;
    uint256 public constant FEE_RATE_PRECISION =
        10 ** FEE_RATE_PRECISION_DECIMALS;
}

library TransferHelper {
    uint8 public constant USD_DECIMALS = 18;

    using SafeERC20 for IERC20Metadata;

    /**
     * @dev Retrieves the number of decimal places for USD.
     * @return The number of decimal places for USD.
     */
    function getUSDDecimals() internal pure returns (uint8) {
        return USD_DECIMALS;
    }

    /**
     * @dev Formats the collateral amount by adjusting the number of decimal places.
     * @param amount The original collateral amount. 18 decimals
     * @param collateralTokenDigits The number of decimal places for the collateral token.
     * @return The formatted collateral amount.
     */
    function formatCollateral(
        uint256 amount,
        uint8 collateralTokenDigits
    ) internal pure returns (uint256) {
        return
            (amount * (10 ** uint256(collateralTokenDigits))) /
            (10 ** USD_DECIMALS);
    }

    /**
     * @dev Parses the vault asset amount by adjusting the number of decimal places.
     * @param amount The original asset amount in vault.
     * @param originDigits The number of decimal places for the original asset.
     * @return The parsed vault asset amount.
     */
    function parseVaultAsset(
        uint256 amount,
        uint8 originDigits
    ) internal pure returns (uint256) {
        return (amount * (10 ** uint256(USD_DECIMALS))) / (10 ** originDigits);
    }

    /**
     * @dev This library contains utility functions for transferring assets.
     * @param amount The amount of assets to transfer in integer format with decimal precision.
     * @param collateralTokenDigits The decimal precision of the collateral token.
     * @return The transferred asset amount converted to integer with decimal precision for the USD stablecoin.
     * This function is internal and can only be accessed within the current contract or library.
     */
    function parseVaultAssetSigned(
        int256 amount,
        uint8 collateralTokenDigits
    ) internal pure returns (int256) {
        return
            (amount * int256(10 ** uint256(collateralTokenDigits))) /
            int256(10 ** uint256(USD_DECIMALS));
    }

    /**
     * @dev Transfers a specified amount of tokens from a given address to another address.
     * @param tokenAddress The address of the token.
     * @param _from The address from which the tokens will be transferred.
     * @param _to The address to which the tokens will be transferred.
     * @param _tokenAmount The amount of tokens to be transferred.
     */
    function transferIn(
        address tokenAddress,
        address _from,
        address _to,
        uint256 _tokenAmount
    ) internal {
        // If the token amount is 0, return.
        if (_tokenAmount == 0) return;
        // Retrieve the token contract.
        IERC20Metadata coll = IERC20Metadata(tokenAddress);
        // Format the collateral amount based on the token's decimals and transfer the tokens.
        coll.safeTransferFrom(
            _from,
            _to,
            formatCollateral(
                _tokenAmount,
                IERC20Metadata(tokenAddress).decimals()
            )
        );
    }

    /**
     * @dev Transfers a specified amount of tokens to a given address.
     * @param tokenAddress The address of the token.
     * @param _to The address to which the tokens will be transferred.
     * @param _tokenAmount The amount of tokens to be transferred.
     */
    function transferOut(
        address tokenAddress,
        address _to,
        uint256 _tokenAmount
    ) internal {
        // If the token amount is 0, return.
        if (_tokenAmount == 0) return;
        // Retrieve the token contract.
        IERC20Metadata coll = IERC20Metadata(tokenAddress);
        // Format the collateral amount based on the token's decimals.
        _tokenAmount = formatCollateral(
            _tokenAmount,
            IERC20Metadata(tokenAddress).decimals()
        );
        // Transfer the tokens to the specified address.
        coll.safeTransfer(_to, _tokenAmount);
    }
}
