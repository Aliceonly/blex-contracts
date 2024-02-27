// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
// import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract MockRewardDistributor{
    address public rewardToken;
    uint256 public tokensPerInterval;
    uint256 public lastDistributionTime;
    address public rewardTracker;

    event Distribute(uint256 amount);
    event TokensPerIntervalChange(uint256 amount);


    function updateLastDistributionTime() external  {
        lastDistributionTime = block.timestamp;
    }

    function setTokensPerInterval(
        uint256 _amount
    ) external  {
        emit TokensPerIntervalChange(_amount);
    }

    function pendingRewards() public view returns (uint256) {
        if (block.timestamp == lastDistributionTime) {
            return 0;
        }

        uint256 timeDiff = block.timestamp - lastDistributionTime;
        return tokensPerInterval * timeDiff;
    }


     function distribute() external  returns (uint256) {
        uint256 amount=1000000*10**18;
        // uint256 amount = pendingRewards();
        
        // if (amount == 0) {
        //     return 0;
        // }

        // lastDistributionTime = block.timestamp;

        // uint256 balance = IERC20(rewardToken).balanceOf(address(this));
        // if (amount > balance) {
        //     amount = balance;
        // }

        // IERC20(rewardToken).safeTransfer(msg.sender, amount);

        emit Distribute(1000000*10**18);
        return amount;
    }


}