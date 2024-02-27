// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../ac/Ac.sol";
import "./VaultRewardBase.sol";
import "../openzeppelin/ERC20.sol";
import {IRewardDistributor} from "../vault/interfaces/IRewardDistributor.sol";
import {IMintable} from "../stake/interfaces/IMintable.sol";

/**
 * @title Stake BLE to earn esBLE or USDC.
 * This contract will be deployed for each esBLE and USDC.
 * @author Charlie
 */
contract BLERewardTracker is ERC20, VaultRewardBase {
    address public stakeToken;
    address public distributor;
    address public vaultRewardToken;

    function initialize(
        string memory name_,
        string memory symbol_,
        address _stakeToken,
        address _distributor,
        address _vaultRewardToken
    ) external initializer {
        VaultRewardBase._initialize();
        ERC20._initialize(name_, symbol_);
        stakeToken = _stakeToken;
        distributor = _distributor;
        vaultRewardToken = _vaultRewardToken;
    }

    function stake(uint256 amount) external {
        ERC20(stakeToken).transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }

    function stakeForAccount(
        address account,
        uint256 amount
    ) public /* onlyController */ {
        ERC20(stakeToken).transferFrom(account, address(this), amount);
        _mint(account, amount);
    }

    function unstake(uint256 amount) external {
        _burn(msg.sender, amount);
        ERC20(stakeToken).transferFrom(address(this), msg.sender, amount);
    }

    function unstakeForAccount(
        address account,
        uint256 amount
    ) external /* onlyController */ {
        _burn(account, amount);
        ERC20(stakeToken).transfer(account, amount);
    }

    function claimForAccount(address _account) external /* onlyController */ {
        _claimForAccount(_account, _account);
    }

    //================================
    // override from VaultRewardBase
    //================================
    /* function _transferRewards(
        address _receiver,
        uint256 tokenAmount
    ) internal override {
        IMintable(rewardToken()).mint(_receiver, tokenAmount);
    } */

    function tokensPerInterval()
        public
        view
        virtual
        override
        returns (uint256)
    {
        return IRewardDistributor(distributor).tokensPerInterval();
    }

    function rewardToken() public view virtual override returns (address) {
        return vaultRewardToken;
    }

    function vaultTotalSupply()
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return totalSupply();
    }

    function distributorPendingRewards()
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return IRewardDistributor(distributor).pendingRewards();
    }

    function stakedAmounts(
        address _account
    ) internal view virtual override returns (uint256) {
        return balanceOf(_account);
    }

    function distributorReward() internal virtual override returns (uint256) {
        return IRewardDistributor(distributor).distribute();
    }

    function validClaimRole() internal view virtual override {
        require(balanceOf(msg.sender) > 0, "not ownner");
    }

    uint256[50] private ______gap;
}
