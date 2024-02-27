// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
import "../ac/AcUpgradable.sol";
import "./interfaces/IBLERouter.sol";
import "./interfaces/IBNFT.sol";
import "./interfaces/IVester.sol";

interface IRewardTracker {
    function claimForAccount(address account) external;

    function stakeForAccount(address account) external;

    function unstakeForAccount(address account) external;

    function claimable(address _account) external view returns (uint256);
}

interface IBooster {
    function boostForAccount(address account) external;
}

contract RewardRouter is AcUpgradable {
    address[] public rewardTrackers; // 0 ble, 1 nft, 2 vester
    address public booster;

    function initialize(address[] memory _rewardTrackers) external initializer {
        AcUpgradable._initialize(msg.sender);
        rewardTrackers = _rewardTrackers;
    }

    function claimAll(address[] memory _addrs) external {
        for (uint i = 0; i < _addrs.length; i++) {
            IRewardTracker rt = IRewardTracker(_addrs[i]);
            try rt.claimForAccount(msg.sender) {} catch {}
        }
    }

    function claimable(
        address account,
        address pool
    ) external view returns (uint256) {
        return IRewardTracker(pool).claimable(account);
    }

    //=========================
    //        esBLE
    //=========================
    function boost() external {
        IBooster(booster).boostForAccount(msg.sender);
    }

    function depositEsBLE(uint256 amount) external {
        IVester(rewardTrackers[2]).depositForAccount(msg.sender, amount);
    }

    function withdrawEsBLE() external {
        IVester(rewardTrackers[2]).withdrawForAccount(msg.sender);
    }

    //=========================
    //        BLE
    //=========================
    function stakeBLE(uint256 amount) external {
        IBLERouter(rewardTrackers[0]).stakeForAccount(msg.sender, amount);
    }

    function unstakeBLE(uint256 amount) external {
        IBLERouter(rewardTrackers[0]).unstakeForAccount(msg.sender, amount);
    }

    //=========================
    //        NFT
    //=========================
    function mintNFT() external {
        IBNFT(rewardTrackers[1]).mintForAccount(msg.sender);
    }
}
