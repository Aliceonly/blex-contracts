// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {Vm} from "../../../../lib/forge-std/src/Vm.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {IERC4626} from "../../../../contracts/vault/ERC4626.sol";
import {IERC20} from "../../../../contracts/vault/ERC20.sol";

import {USDC} from "../../../../contracts/mocker/USDC.sol";

import {FundFee} from "../../../../contracts/fee/FundFee.sol";
import {FeeVault} from "../../../../contracts/fee/FeeVault.sol";
import {FeeRouter} from "../../../../contracts/fee/FeeRouter.sol";

import {console2} from "../../../../lib/forge-std/src/console2.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {RewardDistributor} from "../../../../contracts/vault/RewardDistributor.sol";
import {MockVaultRewardForCoreVault} from "../../../../contracts/mocker/MockVaultRewardForCoreVault.sol";

contract DocsRewardDistributorTest is Test {
    event Distribute(uint256 amount);
    event TokensPerIntervalChange(uint256 amount);
    event RewardUpdated(address user, uint256 currentRewards);
    event Transfer(address indexed from, address indexed to, uint256 value);

    RewardDistributor rewardDistributor;
    MockVaultRewardForCoreVault vaultReward;
    USDC usdc;

    function setUp() public {
        rewardDistributor = new RewardDistributor();
        usdc = new USDC("USDC", "USDC", 10000000);
        vaultReward = new MockVaultRewardForCoreVault();
        rewardDistributor.initialize(address(usdc), address(vaultReward));
        //usdc.mint(address(rewardDistributor),10**20);
    }

    function testRD01001() public {
        rewardDistributor.grantRole(keccak256("VAULT_MGR_ROLE"), address(this));
        uint256 beforeTimestamp = block.timestamp;
        vm.warp(block.timestamp + 15 * 60 * 60);
        rewardDistributor.updateLastDistributionTime();
        assertNotEq(rewardDistributor.lastDistributionTime(), 0);
        assertEq(
            rewardDistributor.lastDistributionTime(),
            beforeTimestamp + 15 * 60 * 60
        );
    }

    function testRD01002() public {
        vm.expectRevert();
        rewardDistributor.updateLastDistributionTime();
    }

    function testRD02001() public {
        rewardDistributor.grantRole(keccak256("MANAGER_ROLE"), address(this));
        address owner = address(0x1);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 100 * 10 ** 6;
        usdc.mint(address(rewardDistributor), targetAmount);
        uint256 beforeAmount = usdc.balanceOf(owner);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(rewardDistributor), owner, targetAmount);
        rewardDistributor.withdrawToken(address(usdc), owner, 100 * 10 ** 6);
        uint256 afterAmount = usdc.balanceOf(owner);
        assertEq(targetAmount, afterAmount - beforeAmount);
    }

    function testRD02002() public {
        address owner = address(0x1);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 100 * 10 ** 6;
        usdc.mint(address(rewardDistributor), targetAmount);
        vm.expectRevert();
        rewardDistributor.withdrawToken(address(usdc), owner, 10 * 10 ** 6);
    }

    function testRD03001() public {
        rewardDistributor.grantRole(keccak256("VAULT_MGR_ROLE"), address(this));

        assertEq(rewardDistributor.lastDistributionTime(), 0);
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(address(0x0), 0);
        vm.expectEmit(false, false, false, true, address(rewardDistributor));
        emit TokensPerIntervalChange(10 * 60 * 60);
        rewardDistributor.setTokensPerInterval(10 * 60 * 60);
        assertEq(rewardDistributor.tokensPerInterval(), 10 * 60 * 60);
    }

    function testRD03002() public {
        rewardDistributor.grantRole(keccak256("VAULT_MGR_ROLE"), address(this));
        rewardDistributor.updateLastDistributionTime();
        vm.warp(15 * 60 * 60);
        assertNotEq(rewardDistributor.lastDistributionTime(), 0);
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(address(0x0), 0);
        vm.expectEmit(false, false, false, true, address(rewardDistributor));
        emit TokensPerIntervalChange(10 * 60 * 60);
        rewardDistributor.setTokensPerInterval(10 * 60 * 60);
        assertEq(rewardDistributor.tokensPerInterval(), 10 * 60 * 60);
    }

    function testRD03003() public {
        vm.expectRevert();
        rewardDistributor.setTokensPerInterval(10 * 60 * 60);
    }

    function testRD04001() public {
        rewardDistributor.grantRole(keccak256("VAULT_MGR_ROLE"), address(this));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 10000000 * 10 ** 6;
        usdc.mint(address(rewardDistributor), targetAmount);
        vm.startPrank(address(vaultReward));
        uint256 amount = rewardDistributor.distribute();
        assertEq(amount, 0);
    }

    function testRD04002() public {
        rewardDistributor.grantRole(keccak256("VAULT_MGR_ROLE"), address(this));
        rewardDistributor.setTokensPerInterval(15 * 60 * 60);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 10000000 * 10 ** 6;
        usdc.mint(address(rewardDistributor), targetAmount);
        vm.startPrank(address(vaultReward));
        uint256 amount = rewardDistributor.distribute();
        assertEq(amount, 0);
    }

    function testRD04003() public {
        rewardDistributor.grantRole(keccak256("VAULT_MGR_ROLE"), address(this));

        rewardDistributor.setTokensPerInterval(15 * 60 * 60);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 10000000 * 10 ** 6;
        usdc.mint(address(rewardDistributor), targetAmount);
        vm.startPrank(address(vaultReward));
        vm.warp(15 * 60 * 60 + block.timestamp);
        uint256 amount = rewardDistributor.pendingRewards();
        uint256 beforeAmount = usdc.balanceOf(address(vaultReward));
        amount = amount > targetAmount ? targetAmount : amount;
        vm.expectEmit(false, false, false, true, address(rewardDistributor));
        emit Distribute(amount);
        rewardDistributor.distribute();
        uint256 afterAmount = usdc.balanceOf(address(vaultReward));
        assertEq(afterAmount - beforeAmount, amount);
        vm.stopPrank();
    }

    function testRD04004() public {
        rewardDistributor.grantRole(keccak256("VAULT_MGR_ROLE"), address(this));

        rewardDistributor.setTokensPerInterval(150000 * 60 * 60);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 10 * 10 ** 6;
        usdc.mint(address(rewardDistributor), targetAmount);
        vm.startPrank(address(vaultReward));
        vm.warp(1500 * 60 * 60 + block.timestamp);
        vm.expectEmit(false, false, false, true, address(rewardDistributor));
        emit Distribute(targetAmount);
        rewardDistributor.distribute();
        vm.stopPrank();
    }

    function testRD04005() public {
        vm.warp(15 * 60 * 60 + block.timestamp);
        vm.expectRevert();
        rewardDistributor.distribute();
    }
}
