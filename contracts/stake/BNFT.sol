// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./interfaces/IMintable.sol";
import "../ac/Ac.sol";
import "./VaultRewardBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {ERC721} from "../openzeppelin/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IVaultReward} from "../vault/interfaces/IVaultReward.sol";
import {IERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {IMintable} from "./interfaces/IMintable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {TransferHelper} from "../utils/TransferHelper.sol";

/**
 * @title This contract can mint NFTs.
 * NFT owners can earn trading rewards of BPT
 * and will receive the same rewards as BLE owners for a period of 3 years.
 * @author Charlie
 */
contract BNFT is ERC721, VaultRewardBase {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;
    string public baseURI;
    address public receiveToken;
    address public vault;
    address public BPTRewardToken;
    address public distributor;

    uint256 public refVolPct;
    uint256 public volumePerReward;
    uint256 public price;
    uint256 public maxNFT;
    uint256 public mintAutoIncreaseId;

    mapping(address => uint256) public pendingBPTReward;
    mapping(uint256 => uint256) public lpAmount; // tokenid => lp amount
    mapping(address => EnumerableSet.UintSet) userNFTIds;

    function getUserNFTIds(
        address _user
    )
        external
        view
        returns (uint256[] memory _ids, uint256[] memory _lpAmounts)
    {
        _ids = userNFTIds[_user].values();
        _lpAmounts = new uint256[](_ids.length);
        for (uint i = 0; i < _ids.length; i++) {
            _lpAmounts[i] = lpAmount[_ids[i]];
        }
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _baseU,
        address _BPTRewardToken,
        address _vaultReward,
        uint256 _maxNFT
    ) external initializer {
        VaultRewardBase._initialize();
        ERC721._initialize(_name, _symbol);
        baseURI = _baseU;
        BPTRewardToken = _BPTRewardToken;
        distributor = _vaultReward;
        maxNFT = _maxNFT;
        //=====
        vault = address(IVaultReward(distributor).coreVault());
        receiveToken = IERC4626(vault).asset();
        price = 1200 * 10 ** IERC20Metadata(receiveToken).decimals();
        refVolPct = (5 * PRECISION) / 100;
        volumePerReward = 10000 * 10 ** TransferHelper.USD_DECIMALS;
    }

    function setPrice(uint256 _p) external onlyRole(VAULT_MGR_ROLE) {
        price = _p;
    }

    function mint() external nonReentrant {
        _mint(msg.sender);
    }

    function mintForAccount(address acc) external nonReentrant onlyController {
        _mint(acc);
    }

    function setVolumePerReward(
        uint256 amount
    ) external /*onlyRole(VAULT_MGR_ROLE)*/ {
        volumePerReward = amount;
    }

    function setRefVolPct(
        uint256 amount
    ) external /*onlyRole(VAULT_MGR_ROLE)*/ {
        refVolPct = amount;
    }

    event Distribute(
        address indexed account,
        uint256 tradeVolume,
        uint256 rewardAmount,
        bool isRef,
        bool isFromNFT
    );

    // called by referral(bpt reward), update BPT rewards
    function distribute(
        address account,
        uint256 _tradeVolume,
        bool isRef
    ) external /* onlyController */ {
        uint256 tradeVolume = _tradeVolume;
        if (balanceOf(account) > 0) tradeVolume *= 2;
        if (isRef) tradeVolume = (refVolPct * tradeVolume) / PRECISION;
        tradeVolume /= volumePerReward;
        pendingBPTReward[account] += tradeVolume;
        if (balanceOf(account) > 0) {
            emit Distribute(
                account,
                _tradeVolume,
                tradeVolume / 2,
                isRef,
                true
            );
            emit Distribute(
                account,
                _tradeVolume,
                tradeVolume / 2,
                isRef,
                false
            );
        } else {
            emit Distribute(account, _tradeVolume, tradeVolume, isRef, false);
        }
    }

    event ClaimBPT(address indexed account, uint256 rev);

    function claimForAccount(
        address account
    ) public nonReentrant /* onlyController */ {
        // validClaimRole();
        // This function will update & claim the USDC in the reward reward
        _claimForAccount(account, account);

        uint256 temp = pendingBPTReward[account];

        // claim bpt reward
        IMintable(BPTRewardToken).mint(account, temp);
        delete pendingBPTReward[account];
        emit ClaimBPT(account, temp);
    }

    //================================
    // override from VaultRewardBase
    //================================
    function tokensPerInterval()
        public
        view
        virtual
        override
        returns (uint256)
    {
        return IVaultReward(distributor).tokensPerInterval();
    }

    function rewardToken() public view virtual override returns (address) {
        return IERC4626(vault).asset();
    }

    function vaultTotalSupply()
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return IERC4626(vault).balanceOf(address(this));
    }

    function distributorPendingRewards()
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return IVaultReward(distributor).pendingRewards();
    }

    function distributorReward() internal virtual override returns (uint256) {
        return IVaultReward(distributor).claimLPReward();
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 /* batchSize */
    ) internal virtual override {
        userNFTIds[from].remove(firstTokenId);
        userNFTIds[to].add(firstTokenId);
    }

    //================================
    //         private funcs
    //================================
    function _mint(address acc) internal {
        mintAutoIncreaseId += 1;
        uint256 _tokenId = mintAutoIncreaseId;
        require(_tokenId <= maxNFT, "invalid NFT");

        uint256 pay = price;
        IERC20(receiveToken).safeTransferFrom(acc, address(this), pay);
        IERC20(receiveToken).approve(distributor, pay); //(acc, address(this), pay);
        lpAmount[_tokenId] = IVaultReward(distributor).buy(
            IERC4626(vault),
            address(this),
            pay,
            0
        );
        super._mint(acc, _tokenId);
    }

    //================================
    //         view funcs
    //================================
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function stakedAmounts(
        address _account
    ) internal view virtual override returns (uint256 lps) {
        for (uint256 i; i < userNFTIds[_account].length(); ) {
            uint256 _tid = userNFTIds[_account].at(i);
            lps += lpAmount[_tid];
            unchecked {
                ++i;
            }
        }
    }

    function validClaimRole() internal view virtual override {
        require(balanceOf(msg.sender) > 0, "not own nft");
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, AccessControl) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    uint256[49] private ______gap;
}
