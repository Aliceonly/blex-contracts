// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract MockVaultRewardForCoreVault {
    uint256 public constant PRECISION = 1e30;
    uint256 public cumulativeRewardPerToken;
    address public distributor;
    uint256 public apr;

    mapping(address => uint256) public previousCumulatedRewardPerToken;
    mapping(address => uint256) public lpEarnedRewards;
    mapping(address => uint256) public claimableReward;
    mapping(address => uint256) public averageStakedAmounts;

    event Harvest(address account, uint256 amount);
    event LogUpdatePool(uint256 supply, uint256 cumulativeRewardPerToken);
    event RewardUpdated(address user, uint256 currentRewards);

    function updateRewardsByAccount(address _account) public {
        previousCumulatedRewardPerToken[_account]=block.timestamp;
        emit RewardUpdated(_account, 0);
    }

    function updateRewards() public {
        emit RewardUpdated(address(0), 0);
    }

     
}
