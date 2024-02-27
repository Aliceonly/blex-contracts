// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {Vm} from "../../../../lib/forge-std/src/Vm.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {IERC4626} from "../../../../contracts/vault/ERC4626.sol";
import {IERC20} from "../../../../contracts/vault/ERC20.sol";

import {CoreVault} from "../../../../contracts/vault/CoreVault.sol";
import {USDC} from "../../../../contracts/mocker/USDC.sol";

import {VaultReward} from "../../../../contracts/vault/VaultReward.sol";
import {VaultRouter} from "../../../../contracts/vault/VaultRouter.sol";

import {FundFee} from "../../../../contracts/fee/FundFee.sol";
import {FeeVault} from "../../../../contracts/fee/FeeVault.sol";
import {FeeRouter} from "../../../../contracts/fee/FeeRouter.sol";

import {RewardDistributor} from "../../../../contracts/vault/RewardDistributor.sol";
import {console2} from "../../../../lib/forge-std/src/console2.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {MockFeeRouter} from "../../../../contracts/mocker/MockFeeRouter.sol";
import {CalcCoreVault} from "../../utils/calc.sol";
import {TransferHelper} from "../../../../contracts/utils/TransferHelper.sol";

contract MockForkMarket {
    function getPNL() external view returns (int256) {
        return -10000000;
    }
}

contract DocsVaultRewardTest is Test {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Harvest(address account, uint256 amount);
    event LogUpdatePool(uint256 supply, uint256 cumulativeRewardPerToken);
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
    event Distribute(uint256 amount);

    CoreVault coreVault;
    RewardDistributor rewardDistributor;
    VaultReward vaultReward;
    VaultRouter vaultRouter;
    FeeVault feeVault;
    FundFee fundFee;
    MockFeeRouter feeRouter;
    USDC usdc;
    MockForkMarket mockMarket;

    function setUp() public {
        usdc = new USDC("USDC", "USDC", 10000000);
        coreVault = new CoreVault();
        rewardDistributor = new RewardDistributor();
        vaultReward = new VaultReward();
        vaultRouter = new VaultRouter();
        feeRouter = new MockFeeRouter();
        feeVault = new FeeVault();
        fundFee = new FundFee();
        coreVault.initialize(
            address(usdc),
            "CoreVault",
            "CoreVault",
            address(vaultRouter),
            address(feeRouter),
            address(vaultReward)
        );
        rewardDistributor.initialize(address(usdc), address(vaultReward));
        vaultReward.initialize(
            address(coreVault),
            address(vaultRouter),
            address(feeRouter),
            address(rewardDistributor)
        );

        mockMarket = new MockForkMarket();

        vaultRouter.initialize(address(coreVault), address(feeRouter));
        // feeRouter.initialize(address(feeVault), address(fundFee));
        // feeRouter.grantRole(
        //     bytes32(keccak256("ROLE_CONTROLLER")),
        //     address(coreVault)
        // );
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        rewardDistributor.grantRole(
            bytes32(keccak256("VAULT_MGR_ROLE")),
            address(this)
        );
        rewardDistributor.setTokensPerInterval(15 * 60 * 60);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        //usdc.mint(address(coreVault), vaultRouter.getAUM());
    }

    function testVR01001() public {
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));

        address firstUser = address(0x1);
        uint256 targetAmount = 10000 * 10 ** 6;
        usdc.mint(firstUser, targetAmount);
        uint256 beforeBLP = coreVault.balanceOf(firstUser);
        uint256 beforeAmount = usdc.balanceOf(firstUser);
        vm.startPrank(firstUser);
        usdc.approve(address(vaultReward), targetAmount);
        uint256 shares = vaultReward.previewDeposit(targetAmount);
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            vaultRouter.getAUM(),
            true
        );
        uint256 cost = targetAmount > s_assets
            ? targetAmount - s_assets
            : s_assets - targetAmount;

        // uint256 _assets = targetAmount > s_assets ? targetAmount : s_assets;
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(firstUser), address(vaultReward), targetAmount);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vaultReward), address(coreVault), targetAmount);
        vm.expectEmit(true, true, false, true, address(coreVault));
        emit DepositAsset(
            address(vaultReward),
            firstUser,
            targetAmount,
            shares,
            cost
        );
        vaultReward.buy(coreVault, firstUser, targetAmount, shares);
        uint256 afterBLP = coreVault.balanceOf(firstUser);
        uint256 afterAmount = usdc.balanceOf(firstUser);
        assertEq(targetAmount, beforeAmount - afterAmount);
        assertGe(afterBLP - beforeBLP, shares);
        vm.stopPrank();
    }

    function testVR01002() public {
        address firstUser = address(0x1);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 10000 * 10 ** 6;
        usdc.mint(firstUser, targetAmount);
        vm.startPrank(firstUser);
        //10000 000000
        usdc.approve(address(vaultReward), targetAmount);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vaultReward), address(coreVault), targetAmount);
        vm.expectRevert(bytes("MinSharesError"));
        vaultReward.buy(coreVault, firstUser, targetAmount, 90000 * 10 ** 6);
        vm.stopPrank();
    }

    function testVR02001() public {
        address firstUser = address(0x1);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 10000 * 10 ** 6;
        uint256 shares = vaultReward.previewDeposit(targetAmount);

        usdc.mint(firstUser, targetAmount);
        vm.startPrank(firstUser);
        usdc.approve(address(vaultReward), targetAmount);
        vaultReward.buy(coreVault, firstUser, targetAmount, 9000 * 10 ** 6);
        //todo
        shares = coreVault.balanceOf(firstUser) / 2;
        targetAmount = vaultReward.previewRedeem(shares);
        int256[] memory arrFee = new int256[](7);
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            coreVault.totalAssets(),
            false
        );

        bool exceeds_assets = s_assets > targetAmount;

        uint256 _assets = exceeds_assets ? targetAmount : s_assets;
        uint256 cost = exceeds_assets
            ? s_assets - targetAmount
            : targetAmount - s_assets;
        arrFee[6] = int256(
            TransferHelper.parseVaultAsset(cost, usdc.decimals())
        );

        vm.warp(block.timestamp + 15 * 60 * 60);
        coreVault.approve(address(vaultReward), shares);
        vm.expectEmit(true, true, true, true, address(coreVault));
        emit WithdrawAsset(
            address(vaultReward),
            firstUser,
            firstUser,
            targetAmount,
            shares,
            cost
        );
        vaultReward.sell(coreVault, firstUser, shares, targetAmount);
        vm.stopPrank();
    }

    function testVR02002() public {
        address firstUser = address(0x1);
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(false, 0);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 10000 * 10 ** 6;
        usdc.mint(firstUser, targetAmount);
        vm.startPrank(firstUser);
        usdc.approve(address(vaultReward), targetAmount);
        vaultReward.buy(coreVault, firstUser, targetAmount, 9000 * 10 ** 6);
        uint256 lpAmount = coreVault.balanceOf(firstUser) / 2;
        vm.warp(block.timestamp + 15 * 60 * 60);
        coreVault.approve(address(vaultReward), lpAmount);
        vm.expectRevert(bytes("MinOutError"));
        vaultReward.sell(coreVault, firstUser, lpAmount, 9000 * 10 ** 6);
        vm.stopPrank();
    }

    function testVR03001() public {
        address firstUser = address(0x1);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(rewardDistributor), 10000000 * 10 ** 20);

        uint256 targetAmount = 10000 * 10 ** 6;
        uint256 shares = vaultReward.previewDeposit(targetAmount);

        usdc.mint(firstUser, targetAmount);
        vm.startPrank(firstUser);
        usdc.approve(address(vaultReward), targetAmount);
        vaultReward.buy(coreVault, firstUser, targetAmount, shares);

        vm.warp(15 * 60 * 60 + block.timestamp);

        uint256 blockReward = rewardDistributor.pendingRewards();
        uint256 supply = coreVault.totalSupply();

        uint256 _cumulativeRewardPerToken;
        uint256 cumulativeRewardPerToken = vaultReward
            .cumulativeRewardPerToken();
        if (supply > 0 && blockReward > 0) {
            _cumulativeRewardPerToken =
                cumulativeRewardPerToken +
                (blockReward * 1e30) /
                supply;
        }
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit LogUpdatePool(supply, _cumulativeRewardPerToken);
        vaultReward.updateRewardsByAccount(address(0x0));
    }

    function testVR03002() public {
        address firstUser = address(0x1);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        // usdc.mint(address(rewardDistributor), 10000000 * 10 ** 20);

        uint256 targetAmount = 10000 * 10 ** 6;
        uint256 shares = vaultReward.previewDeposit(targetAmount);

        usdc.mint(firstUser, targetAmount);
        vm.startPrank(firstUser);
        usdc.approve(address(vaultReward), targetAmount);
        vaultReward.buy(coreVault, firstUser, targetAmount, shares);

        vm.warp(15 * 60 * 60 + block.timestamp);

        uint256 beforeCumulativeRewardPerToken = vaultReward
            .cumulativeRewardPerToken();
        vaultReward.updateRewardsByAccount(address(0x0));
        assertEq(
            vaultReward.cumulativeRewardPerToken(),
            beforeCumulativeRewardPerToken
        );
    }

    function testVR03003() public {
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(rewardDistributor), 10000000 * 10 ** 20);
        vm.warp(15 * 60 * 60 + block.timestamp);
        // vm.expectRevert();
        uint256 beforeCumulativeRewardPerToken = vaultReward
            .cumulativeRewardPerToken();
        vaultReward.updateRewardsByAccount(address(0x0));
        assertEq(
            vaultReward.cumulativeRewardPerToken(),
            beforeCumulativeRewardPerToken
        );
    }

    function testVR03004() public {
        address firstUser = address(0x1);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(rewardDistributor), 10000000 * 10 ** 20);

        uint256 targetAmount = 10000 * 10 ** 6;
        uint256 shares = vaultReward.previewDeposit(targetAmount);

        usdc.mint(firstUser, targetAmount);
        vm.startPrank(firstUser);
        usdc.approve(address(vaultReward), targetAmount);
        vaultReward.buy(coreVault, firstUser, targetAmount, shares);

        vm.warp(15 * 60 * 60 + block.timestamp);

        uint256 blockReward = rewardDistributor.pendingRewards();
        uint256 supply = coreVault.totalSupply();

        uint256 _cumulativeRewardPerToken;
        uint256 cumulativeRewardPerToken = vaultReward
            .cumulativeRewardPerToken();
        if (supply > 0 && blockReward > 0) {
            _cumulativeRewardPerToken =
                cumulativeRewardPerToken +
                (blockReward * 1e30) /
                supply;
        }
        uint256 beforePreAcc = vaultReward.previousCumulatedRewardPerToken(
            firstUser
        );
        uint256 stakeAmount = coreVault.balanceOf(firstUser);
        uint256 accountReward = (stakeAmount *
            (_cumulativeRewardPerToken - beforePreAcc)) / 1e30;
        uint256 _claimableReward = vaultReward.claimableReward(firstUser) +
            accountReward;
        uint256 nextCumulativeReward;
        if (_claimableReward > 0 && stakeAmount > 0) {
            nextCumulativeReward =
                vaultReward.lpEarnedRewards(firstUser) +
                accountReward;
        }

        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit LogUpdatePool(supply, _cumulativeRewardPerToken);
        vaultReward.updateRewardsByAccount(firstUser);
        assertEq(
            _cumulativeRewardPerToken,
            cumulativeRewardPerToken + (blockReward * 1e30) / supply
        );
        assertEq(
            _cumulativeRewardPerToken,
            vaultReward.previousCumulatedRewardPerToken(firstUser)
        );
        assertEq(_claimableReward, vaultReward.claimableReward(firstUser));
        assertEq(nextCumulativeReward, vaultReward.lpEarnedRewards(firstUser));
        vm.stopPrank();
    }

    function testVR04001() public {
        address firstUser = address(0x1);

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(rewardDistributor), 10000000 * 10 ** 20);
        vm.warp(15 * 60 * 60 + block.timestamp);

        uint256 beforeAmount = usdc.balanceOf(firstUser);
        vm.startPrank(firstUser);
        vaultReward.claimLPReward();
        uint256 afterAmount = usdc.balanceOf(firstUser);
        assertEq(afterAmount - beforeAmount, 0);
    }

    function testVR04002() public {
        address firstUser = address(0x1);

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(rewardDistributor), 10000000 * 10 ** 20);
        uint256 targetAmount = 10000 * 10 ** 6;
        uint256 shares = vaultReward.previewDeposit(targetAmount);

        usdc.mint(firstUser, targetAmount);

        vm.startPrank(firstUser);
        usdc.approve(address(vaultReward), targetAmount);
        vaultReward.buy(coreVault, firstUser, targetAmount, shares);
        vm.warp(15 * 60 * 60 + block.timestamp);
        uint256 _previousCumulatedRewardPerToken = vaultReward
            .previousCumulatedRewardPerToken(firstUser);
        uint256 _lpEarnedRewards = vaultReward.lpEarnedRewards(firstUser);

        uint256 tokenAmount = vaultReward.claimable(firstUser);
        console2.log("tokenAmount", tokenAmount);
        uint256 beforeAmount = usdc.balanceOf(firstUser);
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit Harvest(firstUser, tokenAmount);

        vaultReward.claimLPReward();
        uint256 afterAmount = usdc.balanceOf(firstUser);
        assertEq(afterAmount - beforeAmount, tokenAmount);
        assertEq(vaultReward.claimableReward(firstUser), 0);
        assertNotEq(
            _previousCumulatedRewardPerToken,
            vaultReward.previousCumulatedRewardPerToken(firstUser)
        );
        assertNotEq(_lpEarnedRewards, vaultReward.lpEarnedRewards(firstUser));
    }
}
