// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {AcUpgradable} from "../ac/AcUpgradable.sol";
import {Precision} from "../utils/TransferHelper.sol";

abstract contract VaultRewardBase is AcUpgradable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeCast for int256;
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION = Precision.VAULR_REWARD_BASE_PRECISION;
    
    //======================
    uint256 public cumulativeRewardPerToken;

    mapping(address => uint256) public previousCumulatedRewardPerToken;
    mapping(address => uint256) public lpEarnedRewards;
    mapping(address => uint256) public claimableReward;
    mapping(address => uint256) public averageStakedAmounts;

    function _initialize() internal {
        AcUpgradable._initialize(msg.sender);
    }

    error MinSharesError();
    error MinOutError();

    event Harvest(address account, uint256 amount);
    event LogUpdatePool(uint256 supply, uint256 cumulativeRewardPerToken);

    /**
     * @dev This function is used to update rewards.
     * @notice function can only be called without reentry.
     */
    function updateRewards() external nonReentrant {
        _updateRewards(address(0));
    }

    /**
     * @dev This function allows an LP (liquidity provider) to claim their rewards in the current market.
     * The function first checks that the LP has a non-zero balance in the CoreVault contract.
     * If the LP has a non-zero balance, the function calls the `pendingRewards` function to calculate the amount of
     * rewards the LP is entitled to. The LP's earned rewards are then stored in the `lpEarnedRewards` mapping.
     * Finally, the `transferFromVault` function of the `vaultRouter` contract is called to transfer the rewards
     * from the market's vault to the LP's account.
     */
    function claimLPReward() public nonReentrant {
        validClaimRole();
        address _account = msg.sender;
        _claimForAccount(_account, _account);
    }

    function _transferRewards(
        address _receiver,
        uint256 tokenAmount
    ) internal virtual {
        IERC20(rewardToken()).safeTransfer(_receiver, tokenAmount);
    }

    function _claimForAccount(address _account, address _receiver) internal {
        _updateRewards(_account);
        uint256 tokenAmount = claimableReward[_account];
        claimableReward[_account] = 0;
        _transferRewards(_receiver, tokenAmount);
        emit Harvest(_receiver, tokenAmount);
    }

    /**
     * @dev This function is used to update rewards.
     * @notice function can only be called without reentry.
     * @param _account needs to update the account address for rewards. If it is 0, the rewards for all accounts will be updated.
     */
    function _updateRewards(address _account) private {
        uint256 blockReward = distributorReward(); 
        uint256 supply = vaultTotalSupply(); 
        uint256 _cumulativeRewardPerToken = cumulativeRewardPerToken; 

        if (supply > 0 && blockReward > 0) {
            
            _cumulativeRewardPerToken =
                _cumulativeRewardPerToken +
                (blockReward * PRECISION) /
                supply;
            
            cumulativeRewardPerToken = _cumulativeRewardPerToken; 
            emit LogUpdatePool(supply, cumulativeRewardPerToken);
        }

        
        if (_cumulativeRewardPerToken == 0) {
            return;
        }

        if (_account != address(0)) {
            
            uint256 stakedAmount = stakedAmounts(_account); 
            uint256 accountReward = (stakedAmount *
                (_cumulativeRewardPerToken -
                    previousCumulatedRewardPerToken[_account])) / PRECISION; 

            uint256 _claimableReward = claimableReward[_account] +
                accountReward;

            claimableReward[_account] = _claimableReward; 
            previousCumulatedRewardPerToken[
                _account
            ] = _cumulativeRewardPerToken; 

            if (_claimableReward > 0 && stakedAmounts(_account) > 0) {
                uint256 nextCumulativeReward = lpEarnedRewards[_account] +
                    accountReward;
                
                averageStakedAmounts[_account] = averageStakedAmounts[_account]
                    .mul(lpEarnedRewards[_account])
                    .div(nextCumulativeReward)
                    .add(
                        stakedAmount.mul(accountReward).div(
                            nextCumulativeReward
                        )
                    );
                lpEarnedRewards[_account] = nextCumulativeReward; 
            }
        }
    }

    function pendingRewards() external view returns (uint256) {
        return claimable(msg.sender);
    }

    /**
     * @dev This function is used to retrieve the amount of rewards claimable by a user in a market.
     * The function calculates the amount of claimable rewards by first retrieving the user's staked amount in the market from the `stakedAmounts` mapping.
     * If the user has no stake, the function returns the previously claimed reward amount stored in the `claimableReward` mapping.
     * Otherwise, the function retrieves the total supply of LP tokens in the market from the `coreVault` contract and the total pending rewards from the `IRewardDistributor` contract.
     * The pending rewards are then multiplied by the `PRECISION` constant and added to the `cumulativeRewardPerToken` variable to calculate the next cumulative reward per token value.
     * The difference between the new cumulative reward per token value and the previous one stored in the `previousCumulatedRewardPerToken` mapping for the user is multiplied by the user's staked amount and divided by the `PRECISION` constant to calculate the claimable reward amount.
     * Finally, the function returns the sum of the user's previously claimed reward amount and the newly calculated claimable reward amount.
     * @param _account The user's account address.
     * @return The amount of rewards claimable by the user in the market as a `uint256`.
     */
    function claimable(address _account) public view returns (uint256) {
        uint256 stakedAmount = stakedAmounts(_account);
        if (stakedAmount == 0) {
            return claimableReward[_account];
        }
        uint256 supply = vaultTotalSupply();
        uint256 _pendingRewards = distributorPendingRewards().mul(PRECISION);
        uint256 nextCumulativeRewardPerToken = cumulativeRewardPerToken.add(
            _pendingRewards.div(supply)
        );
        return
            claimableReward[_account].add(
                stakedAmount
                    .mul(
                        nextCumulativeRewardPerToken.sub(
                            previousCumulatedRewardPerToken[_account]
                        )
                    )
                    .div(PRECISION)
            );
    }

    /**
     * @dev This function allows an LP (liquidity provider) to view the amount of rewards they have earned in the current market.
     * The function uses the `msg.sender` parameter to look up the earned rewards for the calling account in the `lpEarnedRewards` mapping.
     * The function returns the amount of rewards earned by the calling account as a `uint256`.
     * @return The amount of rewards earned by the calling account as a `uint256`.
     */
    function getLPReward() public view returns (uint256) {
        if (lpEarnedRewards[msg.sender] == 0) return 0;
        return lpEarnedRewards[msg.sender] - claimableReward[msg.sender];
    }

    /**
     * @dev This function is used to retrieve the number of reward tokens distributed per interval in a market.
     * The function calls the `tokensPerInterval` function of the `IRewardDistributor` contract, which returns the number of reward tokens distributed per interval as a `uint256`.
     * @return The number of reward tokens distributed per interval in the market as a `uint256`.
     */
    function tokensPerInterval() public view virtual returns (uint256) {}

    function rewardToken() public view virtual returns (address) {}

    function vaultTotalSupply() internal view virtual returns (uint256) {}

    function distributorPendingRewards()
        internal
        view
        virtual
        returns (uint256)
    {}

    function stakedAmounts(
        address _account
    ) internal view virtual returns (uint256) {}

    function distributorReward() internal virtual returns (uint256) {}

    function validClaimRole() internal view virtual {}
}
