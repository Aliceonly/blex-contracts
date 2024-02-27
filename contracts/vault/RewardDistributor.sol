// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IVaultReward} from "./interfaces/IVaultReward.sol";
import {AcUpgradable} from "../ac/AcUpgradable.sol";

contract RewardDistributor is AcUpgradable {
    using SafeERC20 for IERC20;

    address public rewardToken;
    uint256 public tokensPerInterval;
    uint256 public lastDistributionTime;
    address public rewardTracker;

    event Distribute(uint256 amount);
    event TokensPerIntervalChange(uint256 amount);

    constructor() {
        //_disableInitializers();
    }

    function initialize(
        address _rewardToken,
        address _rewardTracker
    ) external initializer {
        AcUpgradable._initialize(msg.sender);
        require(_rewardToken != address(0), "zero");
        require(_rewardTracker != address(0), "zero");
        rewardToken = _rewardToken;
        rewardTracker = _rewardTracker;
    }

    /**
     * @dev Withdraws tokens from the contract and transfers them to the specified account.
     * Only the admin can call this function.
     * @param _token The address of the token to withdraw.
     * @param _account The address to transfer the tokens to.
     * @param _amount The amount of tokens to withdraw.
     */
    function withdrawToken(
        address _token,
        address _account,
        uint256 _amount
    ) external onlyManager {
        IERC20(_token).safeTransfer(_account, _amount);
    }

    /**
     * @dev Updates the last distribution time to the current block timestamp.
     * Only the admin can call this function.
     */
    event UpdateLastDistributionTime(uint256 time);

    function updateLastDistributionTime() external onlyRole(VAULT_MGR_ROLE) {
        lastDistributionTime = block.timestamp;

        emit UpdateLastDistributionTime(block.timestamp);
    }

    /**
     * @dev Sets the number of tokens to distribute per interval.
     * Only the admin can call this function.
     * @param _amount The number of tokens per interval.
     */

    function setTokensPerInterval(
        uint256 _amount
    ) external onlyRole(VAULT_MGR_ROLE) {
        if (lastDistributionTime == 0) lastDistributionTime = block.timestamp;
        IVaultReward(rewardTracker).updateRewards();
        tokensPerInterval = _amount;
        emit TokensPerIntervalChange(_amount);
    }

    /**
     * @dev Calculates the pending rewards based on the last distribution time and tokens per interval.
     * @return The pending rewards.
     */
    function pendingRewards() public view returns (uint256) {
        if (block.timestamp == lastDistributionTime) {
            return 0;
        }

        uint256 timeDiff = block.timestamp - lastDistributionTime;
        return tokensPerInterval * timeDiff;
    }

    /**
     * @dev Modifier to only allow the reward tracker contract to call a function.
     */
    modifier onlyRewardTracker() {
        require(
            msg.sender == rewardTracker,
            "RewardDistributor: invalid msg.sender"
        );
        _;
    }

    /**
     * @dev Called by `VaultReward`.Distributes pending rewards to the reward tracker contract.
     * Only the reward tracker contract can call this function.
     * @return The amount of rewards distributed.
     */
    function distribute() external onlyRewardTracker returns (uint256) {
        uint256 amount = pendingRewards();
        if (amount == 0) {
            return 0;
        }

        lastDistributionTime = block.timestamp;

        uint256 balance = IERC20(rewardToken).balanceOf(address(this));
        if (amount > balance) {
            amount = balance;
        }

        IERC20(rewardToken).safeTransfer(msg.sender, amount);

        emit Distribute(amount);
        return amount;
    }

    uint256[50] private ______gap;
}
