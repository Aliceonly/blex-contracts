// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IReferral.sol";
import "./../ac/Ac.sol";
import "../market/interfaces/IMarket.sol";
import "../fee/interfaces/IFeeRouter.sol";
import "../fee/lib/FeeRouterLib.sol";
import {MarketPositionCallBackIntl, MarketCallBackIntl} from "../market/interfaces/IMarketCallBackIntl.sol";

interface IRewardDistributor {
    function distribute(address account, uint256 amount, bool) external;
}

contract Referral is IReferral, AcUpgradable, MarketPositionCallBackIntl {
    struct Tier {
        uint256 totalRebate;
        uint256 discountShare;
    }

    uint256 public constant BASIS_POINTS = 10000;

    bytes32 public constant DEFAULT_CODE = bytes32("dei");

    mapping(address => uint256) public referrerDiscountShares;
    mapping(address => uint256) public referrerTiers;
    mapping(uint256 => Tier) public tiers;

    mapping(bytes32 => address) public codeOwners;
    mapping(address => bytes32) public traderReferralCodes;

    event SetTraderReferralCode(address account, bytes32 code);
    event SetTier(uint256 tierId, uint256 totalRebate, uint256 discountShare);
    event SetReferrerTier(address referrer, uint256 tierId);
    event SetReferrerDiscountShare(address referrer, uint256 discountShare);
    event RegisterCode(address account, bytes32 code);
    event SetCodeOwner(address account, address newAccount, bytes32 code);
    event GovSetCodeOwner(bytes32 code, address newAccount);

    event IncreasePositionReferral(
        address account,
        uint256 sizeDelta,
        uint256 marginFeeBasisPoints,
        bytes32 referralCode,
        address referrer
    );

    event DecreasePositionReferral(
        address account,
        uint256 sizeDelta,
        uint256 marginFeeBasisPoints,
        bytes32 referralCode,
        address referrer
    );

    function initialize() external initializer {
        AcUpgradable._initialize(msg.sender);
        codeOwners[DEFAULT_CODE] = address(this);
    }

    function supportMarketRoleGrantControllerRole()
        internal
        pure
        override
        returns (bool)
    {
        return true;
    }

    function setTier(
        uint256 _tierId,
        uint256 _totalRebate,
        uint256 _discountShare
    ) external onlyManager {
        require(_totalRebate <= BASIS_POINTS, "Referral: invalid totalRebate");
        require(
            _discountShare <= BASIS_POINTS,
            "Referral: invalid discountShare"
        );

        Tier memory tier = tiers[_tierId];
        tier.totalRebate = _totalRebate;
        tier.discountShare = _discountShare;
        tiers[_tierId] = tier;
        emit SetTier(_tierId, _totalRebate, _discountShare);
    }

    function setReferrerTier(
        address _referrer,
        uint256 _tierId
    ) external onlyManager {
        referrerTiers[_referrer] = _tierId;
        emit SetReferrerTier(_referrer, _tierId);
    }

    function setReferrerDiscountShare(
        address _account,
        uint256 _discountShare
    ) external onlyManager {
        require(
            _discountShare <= BASIS_POINTS,
            "Referral: invalid discountShare"
        );

        referrerDiscountShares[_account] = _discountShare;
        emit SetReferrerDiscountShare(_account, _discountShare);
    }

    function setTraderReferralCode(
        address _account,
        bytes32 _code
    ) external onlyManager {
        _setTraderReferralCode(_account, _code);
    }

    function setTraderReferralCodeByUser(bytes32 _code) external {
        _setTraderReferralCode(msg.sender, _code);
    }

    function registerCode(bytes32 _code) external {
        require(_code != bytes32(0), "Referral: invalid _code");
        require(
            codeOwners[_code] == address(0),
            "Referral: code already exists"
        );

        codeOwners[_code] = msg.sender;
        emit RegisterCode(msg.sender, _code);
    }

    modifier onlyCodeOwner(bytes32 _code) {
        address account = codeOwners[_code];
        require(msg.sender == account, "Referral: forbidden");
        _;
    }

    /**This function is designed to change the owner address of a specific code.
     * Only the original owner of the code has the authority to change the owner
     * address of the code. */
    function setCodeOwner(
        bytes32 _code,
        address _newAccount
    ) external onlyCodeOwner(_code) {
        require(_code != bytes32(0), "Referral: invalid _code");

        codeOwners[_code] = _newAccount;
        emit SetCodeOwner(msg.sender, _newAccount, _code);
    }

    function govSetCodeOwner(
        bytes32 _code,
        address _newAccount
    ) external onlyManager {
        require(_code != bytes32(0), "Referral: invalid _code");

        codeOwners[_code] = _newAccount;
        emit GovSetCodeOwner(_code, _newAccount);
    }

    function getTraderReferralInfo(
        address _account
    ) public view returns (bytes32, address) {
        bytes32 code = traderReferralCodes[_account];
        address referrer;
        if (code != bytes32(0)) {
            referrer = codeOwners[code];
        }
        return (code, referrer);
    }

    function _setTraderReferralCode(address _account, bytes32 _code) private {
        traderReferralCodes[_account] = _code;
        emit SetTraderReferralCode(_account, _code);
    }

    function getCodeOwners(
        bytes32[] memory _codes
    ) public view returns (address[] memory) {
        address[] memory owners = new address[](_codes.length);

        for (uint256 i = 0; i < _codes.length; i++) {
            bytes32 code = _codes[i];
            owners[i] = codeOwners[code];
        }

        return owners;
    }

    function updatePositionCallback(
        UpdatePositionEvent memory _event
    ) external override onlyController {
        (bytes32 referralCode, address referrer) = getTraderReferralInfo(
            _event.inputs._account
        );
        bytes32 _referralCode = _event.inputs._refCode;
        if (referralCode == bytes32(0)) {
            referrer = codeOwners[_event.inputs._refCode];
            if (referrer == address(0)) return;
            _setTraderReferralCode(
                _event.inputs._account,
                _event.inputs._refCode
            );
            referralCode = _referralCode;
        }
        // call BPTRewardRewarder
        if (rewarder != address(0)) {
            try
                IRewardDistributor(rewarder).distribute(
                    _event.inputs._account,
                    _event.inputs._sizeDelta,
                    false
                )
            {} catch {}
            if (referrer != address(0))
                try
                    IRewardDistributor(rewarder).distribute(
                        referrer,
                        _event.inputs._sizeDelta,
                        true
                    )
                {} catch {}
        }

        if (_event.inputs.isOpen) {
            emit IncreasePositionReferral(
                _event.inputs._account,
                _event.inputs._sizeDelta,
                IMarket(msg.sender).feeRouter().feeAndRates(
                    msg.sender,
                    uint8(FeeRouterLib.FeeType.OpenFee)
                ),
                _event.inputs._refCode,
                referrer
            );
        } else {
            emit DecreasePositionReferral(
                _event.inputs._account,
                _event.inputs._sizeDelta,
                IMarket(msg.sender).feeRouter().feeAndRates(
                    msg.sender,
                    uint8(FeeRouterLib.FeeType.CloseFee)
                ),
                _event.inputs._refCode,
                referrer
            );
        }
    }

    function getHooksCalls()
        external
        pure
        override
        returns (MarketCallBackIntl.Calls memory)
    {
        return
            MarketCallBackIntl.Calls({
                updatePosition: true,
                updateOrder: false,
                deleteOrder: false
            });
    }

    address public rewarder;

    uint256[49] private ______gap;
}
