// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {ERC20} from "../openzeppelin/ERC20.sol";
import {ERC4626} from "../openzeppelin/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ICoreVault, IERC4626} from "./interfaces/ICoreVault.sol";
import {IVaultRouter} from "./interfaces/IVaultRouter.sol";
import {Precision, TransferHelper} from "../utils/TransferHelper.sol";
import {AcUpgradable} from "../ac/AcUpgradable.sol";
import {IFeeRouter} from "../fee/interfaces/IFeeRouter.sol";
import {FeeRouterLib} from "../fee/lib/FeeRouterLib.sol";
import {IVaultReward} from "../vault/interfaces/IVaultReward.sol";

contract CoreVault is ERC4626, AcUpgradable, ICoreVault {
    using Math for uint256;
    using SafeERC20 for IERC20;

    IVaultRouter public vaultRouter;
    bool public isFreeze = false;

    IFeeRouter public feeRouter;
    mapping(address => uint256) public lastDepositAt;
    uint256 public cooldownDuration;
    uint256 public constant FEE_RATE_PRECISION = Precision.FEE_RATE_PRECISION;
    uint256 public buyLpFee;
    uint256 public sellLpFee;
    uint256 constant NUMBER_OF_DEAD_SHARES = 1000;

    uint256 constant DEFAULT_SELL_LP_FEE_RATE = 100;

    event CoolDownDurationUpdated(uint256 duration);
    event LPFeeUpdated(bool isBuy, uint256 fee);
    event LogIsFreeze(bool isFreeze);

    event DepositAsset(
        address indexed sender,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        uint256 fee
    );

    event WithdrawAsset(
        address indexed sender,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        uint256 fee
    );

    constructor() {
        // _disableInitializers();
    }

    function initialize(
        address _asset,
        string memory _name,
        string memory _symbol,
        address _vaultRouter,
        address _feeRouter,
        address _vaultReward
    ) external initializer {
        require(_asset != address(0), "!zero address");
        require(_vaultRouter != address(0), "!zero address");
        require(_feeRouter != address(0), "!zero address");
        require(_vaultReward != address(0), "!zero address");

        ERC20._initialize(_name, _symbol);
        ERC4626._initialize(IERC20(_asset));
        AcUpgradable._initialize(msg.sender);

        vaultRouter = IVaultRouter(_vaultRouter);
        _grantRole(ROLE_CONTROLLER, _vaultRouter);
        _grantRole(FREEZER_ROLE, _vaultRouter);

        feeRouter = IFeeRouter(_feeRouter);

        cooldownDuration = 15 minutes;
        sellLpFee = FEE_RATE_PRECISION / DEFAULT_SELL_LP_FEE_RATE;
        vaultReward = _vaultReward;
    }

    event SetVaultRouter(address _vaultRouter);

    function setVaultRouter(
        address _vaultRouter
    ) external override onlyManager {
        require(_vaultRouter != address(0), "!zero address");

        if (address(vaultRouter) != address(0)) {
            _revokeRole(ROLE_CONTROLLER, address(vaultRouter)); //fix: CVB-05 | Old vault router is not removed from `ROLE_CONTROLLER` when setting new vault router
            _revokeRole(FREEZER_ROLE, address(vaultRouter)); //fix: CVB-05 | Old vault router is not removed from `ROLE_CONTROLLER` when setting new vault router
        }
        vaultRouter = IVaultRouter(_vaultRouter);
        _grantRole(ROLE_CONTROLLER, _vaultRouter);
        _grantRole(FREEZER_ROLE, _vaultRouter);

        emit SetVaultRouter(_vaultRouter);
    }

    function setLpFee(bool isBuy, uint256 fee) external override onlyManager {
        isBuy ? buyLpFee = fee : sellLpFee = fee;
        emit LPFeeUpdated(isBuy, fee);
    }

    function setCooldownDuration(
        uint256 _duration
    ) external override onlyManager {
        cooldownDuration = _duration;
        emit CoolDownDurationUpdated(_duration);
    }

    /**
     * @dev Transfers out assets to the specified address.
     * Only the controller can call this function.
     * @param to The address to transfer the assets to.
     * @param amount The amount of assets to transfer.
     */
    function transferOutAssets(
        address to,
        uint256 amount
    ) external override onlyController {
        SafeERC20.safeTransfer(IERC20(asset()), to, amount);
    }

    /**
     * @dev Returns the total assets held in the contract.
     * @return The total assets held in the contract.
     */
    function totalAssets()
        public
        view
        override(ERC4626, IERC4626)
        returns (uint256)
    {
        return vaultRouter.getAUM();
    }

    /**
     * @dev Calculates the computational costs for a transaction.
     * @param isBuy Boolean indicating whether it's a buy transaction.
     * @param amount The amount of assets involved in the transaction.
     * @return The computational costs for the transaction.
     */
    function computationalCosts(
        bool isBuy,
        uint256 amount
    ) public view override returns (uint256) {
        return (amount * getLPFee(isBuy)) / FEE_RATE_PRECISION;
    }

    /**
     * @dev Retrieves the LP fee based on the transaction type.
     * @param isBuy Boolean indicating whether it's a buy transaction.
     * @return The LP fee for the specified transaction type.
     */
    function getLPFee(bool isBuy) public view override returns (uint256) {
        return isBuy ? buyLpFee : sellLpFee;
    }

    /**
     * @dev Converts assets to shares based on rounding method.
     * @param assets The amount of assets to convert.
     * @param rounding The rounding method to use.
     * @return shares The corresponding number of shares.
     */
    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view override returns (uint256 shares) {
        shares = super._convertToShares(assets, rounding);
        bool isBuy = rounding == Math.Rounding.Down;
        if (isBuy) return shares - computationalCosts(isBuy, shares);
        else
            return
                (shares * FEE_RATE_PRECISION) /
                (FEE_RATE_PRECISION - sellLpFee);
    }

    /**
     * @dev Converts shares to assets based on rounding method.
     * @param shares The number of shares to convert.
     * @param rounding The rounding method to use.
     * @return assets The corresponding amount of assets.
     */
    function _convertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal view override returns (uint256 assets) {
        assets = super._convertToAssets(shares, rounding);
        bool isBuy = rounding == Math.Rounding.Up;
        if (isBuy)
            return
                (assets * FEE_RATE_PRECISION) / (FEE_RATE_PRECISION - buyLpFee);
        else return assets - computationalCosts(isBuy, assets);
    }

    /**
     * @dev Transfers the transaction fee to the fee vault.
     * @param account The account to collect the fee from.
     * @param _asset The address of the asset for the fee.
     * @param fee The amount of the fee to transfer.
     * @param isBuy Boolean indicating whether it's a buy transaction.
     */
    function _transFeeToFeeVault(
        address account,
        address _asset,
        uint256 fee,
        bool isBuy
    ) private {
        if (fee == 0) return;

        int256[] memory fees = new int256[](
            uint8(FeeRouterLib.FeeType.Counter)
        );
        IERC20(_asset).approve(address(feeRouter), fee);
        fees[
            uint8(
                isBuy
                    ? FeeRouterLib.FeeType.BuyLpFee
                    : FeeRouterLib.FeeType.SellLpFee
            )
        ] = int256(
            TransferHelper.parseVaultAsset(
                fee,
                IERC20Metadata(_asset).decimals()
            )
        );
        feeRouter.collectFees(account, _asset, fees);
    }

    /**
     * @dev Internal function to handle the deposit of assets.
     * @param caller The address of the caller.
     * @param receiver The address of the receiver.
     * @param assets The amount of assets to deposit.
     * @param shares The number of shares to mint.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        require(false == isFreeze, "vault:freeze");
        //require(msg.sender == vaultReward, "access deined");
        lastDepositAt[receiver] = block.timestamp;
        uint256 s_assets = super._convertToAssets(shares, Math.Rounding.Up);
        uint256 cost = assets > s_assets
            ? assets - s_assets
            : s_assets - assets;
        uint256 _assets = assets > s_assets ? assets : s_assets;

        if (totalSupply() == 0) {
            _mint(address(0), NUMBER_OF_DEAD_SHARES);
            shares -= NUMBER_OF_DEAD_SHARES;
        }
        super._deposit(caller, receiver, _assets, shares);
        _transFeeToFeeVault(receiver, address(asset()), cost, true);

        emit DepositAsset(caller, receiver, assets, shares, cost);
    }

    /**
     * @dev Internal function to handle the withdrawal of assets.
     * @param caller The address of the caller.
     * @param receiver The address of the receiver.
     * @param _owner The address of the owner.
     * @param assets The amount of assets to withdraw.
     * @param shares The number of shares to burn.
     */
    function _withdraw(
        address caller,
        address receiver,
        address _owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        require(false == isFreeze, "vault:freeze");
        //require(msg.sender == vaultReward, "access deined");
        require(
            block.timestamp > cooldownDuration + lastDepositAt[_owner],
            "vault:cooldown"
        );
        uint256 s_assets = super._convertToAssets(shares, Math.Rounding.Down);
        bool exceeds_assets = s_assets > assets;

        uint256 _assets = exceeds_assets ? assets : s_assets;

        // withdraw assets to user(after fee)
        super._withdraw(
            caller,
            receiver,
            _owner, // receiver
            _assets,
            shares
        );

        uint256 cost = exceeds_assets ? s_assets - assets : assets - s_assets;
        _transFeeToFeeVault(_owner, address(asset()), cost, false); //ok!

        emit WithdrawAsset(caller, receiver, _owner, assets, shares, cost);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 /* amount */
    ) internal override {
        if (from == address(0))
            IVaultReward(vaultReward).updateRewardsByAccount(to);
        if (to == address(0))
            IVaultReward(vaultReward).updateRewardsByAccount(from);
        if (from == address(0) || to == address(0)) return;
        revert("transfer not allowed");
    }

    function setIsFreeze(bool f) external onlyFreezer {
        isFreeze = f;
        emit LogIsFreeze(f);
    }

    address public vaultReward;

    uint256[49] private ______gap;
}
