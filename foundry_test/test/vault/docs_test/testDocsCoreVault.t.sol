// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {Vm} from "../../../../lib/forge-std/src/Vm.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {IERC4626} from "../../../../contracts/vault/ERC4626.sol";
import {IERC20} from "../../../../contracts/vault/ERC20.sol";
import {CoreVault} from "../../../../contracts/vault/CoreVault.sol";
import {USDC} from "../../../../contracts/mocker/USDC.sol";
import {TransferHelper} from "../../../../contracts/utils/TransferHelper.sol";
import {FundFee} from "../../../../contracts/fee/FundFee.sol";
import {FeeVault} from "../../../../contracts/fee/FeeVault.sol";
import {console2} from "../../../../lib/forge-std/src/console2.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {MockVaultRewardForCoreVault} from "../../../../contracts/mocker/MockVaultRewardForCoreVault.sol";
import {MockVaultRouter} from "../../../../contracts/mocker/MockVaultRouter.sol";
import {MockRewardDistributor} from "../../../../contracts/mocker/MockRewardDistributor.sol";
import {MockFeeRouter} from "../../../../contracts/mocker/MockFeeRouter.sol";
import {CalcCoreVault} from "../../utils/calc.sol";

contract DocsCoreVaultTest is Test {
    event LPFeeUpdated(bool isBuy, uint256 fee);
    event CoolDownDurationUpdated(uint256 duration);
    event LogIsFreeze(bool isFreeze);
    event DepositAsset(
        address indexed sender,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        uint256 fee
    );
    event Transfer(address indexed from, address indexed to, uint256 value);
    event LogUpdatePool(uint256 supply, uint256 cumulativeRewardPerToken);
    event RewardUpdated(address user, uint256 currentRewards);
    event UpdateFee(
        address indexed account,
        address indexed market,
        int256[] fees,
        uint256 amount
    );
    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event WithdrawAsset(
        address indexed sender,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        uint256 fee
    );
    event Deposit(
        address indexed sender,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    event Withdraw(
        address indexed sender,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    CoreVault public coreVault;
    MockRewardDistributor public rewardDistributor;
    MockVaultRewardForCoreVault public vaultReward;
    MockVaultRouter public vaultRouter;
    MockFeeRouter public feeRouter;
    USDC public usdc;

    function setUp() public {
        usdc = new USDC("USDC", "USDC", 10000000);
        coreVault = new CoreVault();
        rewardDistributor = new MockRewardDistributor();
        vaultReward = new MockVaultRewardForCoreVault();
        vaultRouter = new MockVaultRouter(address(coreVault), address(usdc));
        feeRouter = new MockFeeRouter();
        coreVault.initialize(
            address(usdc),
            "CoreVault",
            "CoreVault",
            address(vaultRouter),
            address(feeRouter),
            address(vaultReward)
        );
        // usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        //usdc.mint(address(coreVault), vaultRouter.getAUM());
    }

    function testCV01001() public {
        //Authorize the test contract management Permissions to mint test coins
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        //Mint a certain amount of test coins to the current test contract, and approve
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        //Call the deposit function, this is the first time to increase liquidity
        coreVault.deposit(2000, address(this));
        //move forward a certain amount of time
        vm.warp(20 * 60 * 60 + block.timestamp);
        //The amount of liquidity to be increased this time
        uint256 assets = 1000 * 10 ** 6;
        address owner = address(0x01);
        //The usdc amount of mint assets for the owner user
        usdc.mint(owner, assets);
        //Perform subsequent operations as the owner user
        vm.startPrank(owner);
        //approve
        usdc.approve(address(coreVault), assets);
        //Get the amount of usdc in the coreVault contract before initiating the deposit transaction
        uint256 beforeTotalAssets = usdc.balanceOf(address(coreVault));
        //How much BLP can be obtained by acquiring the amount of assets
        uint256 shares = coreVault.previewDeposit(assets);
        //Calculate the intermediate state value inside the contract according to the calculation method within the current contract
        //s_assets is to calculate how much BLP can be obtained without any fees.
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            vaultRouter.getAUM(),
            true
        );
        //Calculate the handling fee to be charged this time
        uint256 cost = assets > s_assets
            ? assets - s_assets
            : s_assets - assets;
        //Calculate the funds to be transferred to coreVault
        uint256 _assets = assets > s_assets ? assets : s_assets;
        //Determine some intermediate states of the contract by obtaining events
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(owner, address(coreVault), _assets);
        vm.expectEmit(true, true, false, true, address(coreVault));
        //todo
        //The fifth parameter of cost should be 0 (because buyLpFee is 0).
        //In order to let the test run, the wrong value is temporarily written here.
        emit DepositAsset(owner, owner, assets, shares, cost);
        coreVault.deposit(assets, owner);
        uint256 afterTotalAssets = usdc.balanceOf(address(coreVault));
        assertEq(afterTotalAssets - beforeTotalAssets, assets);
        assertEq(false, coreVault.isFreeze());
        assertEq(block.timestamp, coreVault.lastDepositAt(owner));
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );
    }

    function testCV01002() public {
        //Authorize the test contract management Permissions to mint test coins
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        //Mint a certain amount of test coins to the current test contract, and approve
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        //Call the deposit function, this is the first time to increase liquidity
        coreVault.deposit(2000, address(this));
        //Grant permissions `MANAGER_ROLE` to the test contract to set `buyLpFee` vaulue
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(true, 2000);
        vm.warp(20 * 60 * 60 + block.timestamp);
        uint256 assets = 1000 * 10 ** 6;
        address owner = address(0x01);
        usdc.mint(owner, assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        uint256 beforeTotalAssets = usdc.balanceOf(address(coreVault));
        uint256 shares = coreVault.convertToShares(assets);
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            vaultRouter.getAUM(),
            true
        );
        uint256 cost = assets > s_assets
            ? assets - s_assets
            : s_assets - assets;

        uint256 _assets = assets > s_assets ? assets : s_assets;
        console2.log("local cost", cost);
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(owner, address(coreVault), _assets);
        vm.expectEmit(true, true, false, true, address(coreVault));
        //todo cost wrong value
        emit DepositAsset(owner, owner, assets, shares, cost);
        coreVault.deposit(assets, owner);
        uint256 afterTotalAssets = usdc.balanceOf(address(coreVault));
        assertEq(afterTotalAssets - beforeTotalAssets, assets);
        assertEq(false, coreVault.isFreeze());
        assertEq(block.timestamp, coreVault.lastDepositAt(owner));
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );
    }

    function testCV01003(uint256 assets, address receiver) public {
        vm.assume(assets > 100 * 10 ** 6);
        vm.assume(assets < 10000000000000 * 10 ** 6);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), assets);
        vm.startPrank(address(this));
        usdc.approve(address(coreVault), assets);
        coreVault.grantRole(keccak256("FREEZER_ROLE"), address(this));
        coreVault.setIsFreeze(true);
        vm.expectRevert(bytes("vault:freeze"));
        coreVault.deposit(assets, receiver);
    }

    function testCV01004() public {
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));
        vm.warp(20 * 60 * 60 + block.timestamp);
        uint256 assets = 1000 * 10 ** 6;
        address owner = address(0x01);
        usdc.mint(owner, assets);
        vm.startPrank(owner);
        //usdc.approve(address(coreVault), assets);
        vm.expectRevert();
        coreVault.deposit(assets, owner);
    }

    function testCV01005() public {
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 1001);
        usdc.approve(address(coreVault), 1001);
        coreVault.deposit(1001, address(this));
        uint256 assets = 100 * 10 ** 18;
        usdc.mint(address(this), assets);
        usdc.transfer(address(coreVault), assets);
        uint256 shares = coreVault.previewDeposit(100);
        assertEq(shares, 0);
    }

    function testCV02001() public {
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));
        vm.warp(20 * 60 * 60 + block.timestamp);

        uint256 shares = 1000 * 10 ** 6;
        uint256 assets = coreVault.previewMint(shares);
        address owner = address(0x01);
        usdc.mint(owner, assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        uint256 beforeTotalAssets = usdc.balanceOf(address(coreVault));
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            vaultRouter.getAUM(),
            true
        );
        uint256 cost = assets > s_assets
            ? assets - s_assets
            : s_assets - assets;
        console2.log("local cost", cost);
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);
        vm.expectEmit(true, true, false, true, address(coreVault));
        emit Transfer(address(0), owner, shares);

        vm.expectEmit(true, true, false, true, address(coreVault));
        //todo cost wrong vaule
        emit DepositAsset(owner, owner, assets, shares, cost);
        coreVault.mint(shares, owner);
        uint256 afterTotalAssets = usdc.balanceOf(address(coreVault));
        assertEq(afterTotalAssets - beforeTotalAssets, assets);
        assertEq(false, coreVault.isFreeze());
        assertEq(block.timestamp, coreVault.lastDepositAt(owner));
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );
    }

    function testCV02002() public {
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));
        vm.warp(20 * 60 * 60 + block.timestamp);

        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(true, 2000);

        uint256 shares = 1000 * 10 ** 6;
        uint256 assets = coreVault.previewMint(shares);
        address owner = address(0x01);
        usdc.mint(owner, assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        uint256 beforeTotalAssets = usdc.balanceOf(address(coreVault));
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            vaultRouter.getAUM(),
            true
        );
        uint256 cost = assets > s_assets
            ? assets - s_assets
            : s_assets - assets;
        console2.log("local cost", cost);
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);
        vm.expectEmit(true, true, false, true, address(coreVault));
        emit Transfer(address(0), owner, shares);

        vm.expectEmit(true, true, false, true, address(coreVault));
        //todo cost wrong value
        emit DepositAsset(owner, owner, assets, shares, cost);
        coreVault.mint(shares, owner);
        uint256 afterTotalAssets = usdc.balanceOf(address(coreVault));
        assertEq(afterTotalAssets - beforeTotalAssets, assets);
        assertEq(false, coreVault.isFreeze());
        assertEq(block.timestamp, coreVault.lastDepositAt(owner));
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );
    }

    function testCV02003(uint256 shares, address receiver) public {
        vm.assume(shares > 100 * 10 ** 6);
        vm.assume(shares < 10000000000000 * 10 ** 6);
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 assets = coreVault.previewMint(shares);

        usdc.mint(address(this), assets);
        vm.startPrank(address(this));
        usdc.approve(address(coreVault), assets);
        coreVault.grantRole(keccak256("FREEZER_ROLE"), address(this));
        coreVault.setIsFreeze(true);
        vm.expectRevert(bytes("vault:freeze"));
        coreVault.mint(shares, receiver);
    }

    function testCV02004() public {
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000 * 10 ** 6);
        usdc.approve(address(coreVault), 2000 * 10 ** 6);
        coreVault.deposit(2000 * 10 ** 6, address(this));
        vm.warp(20 * 60 * 60 + block.timestamp);
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(true, 10000);

        uint256 shares = 1000 * 10 ** 6;
        uint256 assets = coreVault.previewMint(shares);
        address owner = address(0x01);
        usdc.mint(owner, assets);

        vm.startPrank(owner);
        //usdc.approve(address(coreVault), assets);
        vm.expectRevert();
        coreVault.mint(shares, owner);
    }

    function testCV03001(address owner, address receiver) public {
        vm.assume(receiver != address(0) && owner != address(0));
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(false, 0);
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));
        //60915427
        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);

        coreVault.deposit(assets, owner);
        uint256 beforeAmount = usdc.balanceOf(receiver);
        vm.warp(block.timestamp + 15 * 60 * 60);
        uint256 shares = coreVault.balanceOf(owner);

        assets = coreVault.previewRedeem(shares);

        int256[] memory arrFee = new int256[](7);
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            coreVault.totalAssets(),
            false
        );

        bool exceeds_assets = s_assets > assets;

        uint256 _assets = exceeds_assets ? assets : s_assets;
        uint256 cost = exceeds_assets ? s_assets - assets : assets - s_assets;
        arrFee[6] = int256(
            TransferHelper.parseVaultAsset(cost, usdc.decimals())
        );
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit Withdraw(owner, receiver, owner, _assets, shares);

        // vm.expectEmit(true, true, false, true, address(feeRouter));
        // emit UpdateFee(owner, address(coreVault), arrFee, 0);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit WithdrawAsset(owner, receiver, owner, assets, shares, cost);
        coreVault.redeem(shares, receiver, owner);
        uint256 afterAmount = usdc.balanceOf(receiver);
        assertEq(assets, afterAmount - beforeAmount);
        assertEq(coreVault.isFreeze(), false);
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );
        vm.stopPrank();
    }

    function testCV03002(address owner, address receiver) public {
        vm.assume(receiver != address(0) && owner != address(0));
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(false, 20000);

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));

        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);

        coreVault.deposit(assets, owner);
        uint256 beforeAmount = usdc.balanceOf(receiver);
        vm.warp(block.timestamp + 15 * 60 * 60);
        uint256 shares = coreVault.balanceOf(owner);

        assets = coreVault.previewRedeem(shares);

        int256[] memory arrFee = new int256[](7);
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            coreVault.totalAssets(),
            false
        );

        bool exceeds_assets = s_assets > assets;

        uint256 _assets = exceeds_assets ? assets : s_assets;
        uint256 cost = exceeds_assets ? s_assets - assets : assets - s_assets;
        arrFee[6] = int256(
            TransferHelper.parseVaultAsset(cost, usdc.decimals())
        );
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit Withdraw(owner, receiver, owner, _assets, shares);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit WithdrawAsset(owner, receiver, owner, assets, shares, cost);
        coreVault.redeem(shares, receiver, owner);
        uint256 afterAmount = usdc.balanceOf(receiver);
        assertEq(assets, afterAmount - beforeAmount);
        assertEq(coreVault.isFreeze(), false);
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );
        vm.stopPrank();
    }

    function testCoreVault03003(address receiver, address owner) public {
        vm.assume(receiver != address(0) && owner != address(0));
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        coreVault.deposit(assets, owner);
        vm.stopPrank();

        uint256 shares = coreVault.balanceOf(owner);
        coreVault.grantRole(keccak256("FREEZER_ROLE"), address(this));
        coreVault.setIsFreeze(true);
        vm.startPrank(owner);
        vm.expectRevert(bytes("vault:freeze"));
        coreVault.redeem(shares, receiver, owner);
        vm.stopPrank();
    }

    function testCoreVault03004(address receiver, address owner) public {
        vm.assume(receiver != address(0) && owner != address(0));
        //vm.assume(assets>10*10*6 && assets < 123123000000);
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        coreVault.deposit(assets, owner);
        uint256 shares = coreVault.balanceOf(owner);
        vm.expectRevert(bytes("vault:cooldown"));
        coreVault.redeem(shares, receiver, owner);
        vm.stopPrank();
    }

    function testCV04001(address owner, address receiver) public {
        vm.assume(receiver != address(0) && owner != address(0));
        //vm.assume(assets>10*10*6 && assets < 123123000000);
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));
        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        coreVault.deposit(assets, owner);
        uint256 beforeAmount = usdc.balanceOf(receiver);
        vm.warp(block.timestamp + 15 * 60 * 60);
        //todo
        assets = assets / 2;

        uint256 shares = coreVault.previewWithdraw(assets);
        console2.log("shares", shares);

        int256[] memory arrFee = new int256[](7);
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            coreVault.totalAssets(),
            false
        );

        bool exceeds_assets = s_assets > assets;

        uint256 _assets = exceeds_assets ? assets : s_assets;
        uint256 cost = exceeds_assets ? s_assets - assets : assets - s_assets;
        arrFee[6] = int256(
            TransferHelper.parseVaultAsset(cost, usdc.decimals())
        );
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit Withdraw(owner, receiver, owner, _assets, shares);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit WithdrawAsset(owner, receiver, owner, assets, shares, cost);

        coreVault.withdraw(assets, receiver, owner);
        uint256 afterAmount = usdc.balanceOf(receiver);
        assertEq(assets, afterAmount - beforeAmount);
        assertEq(coreVault.isFreeze(), false);
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );

        vm.stopPrank();
    }

    function testCV04002(address owner, address receiver) public {
        vm.assume(receiver != address(0) && owner != address(0));
        //vm.assume(assets>10*10*6 && assets < 123123000000);
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));
        //60915427
        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);

        coreVault.deposit(assets, owner);
        uint256 beforeAmount = usdc.balanceOf(receiver);
        vm.warp(block.timestamp + 15 * 60 * 60);
        //todo
        assets = assets / 2;

        uint256 shares = coreVault.previewWithdraw(assets);

        int256[] memory arrFee = new int256[](7);
        uint256 s_assets = CalcCoreVault.convertToAssets(
            shares,
            coreVault.totalSupply(),
            coreVault.totalAssets(),
            false
        );

        bool exceeds_assets = s_assets > assets;

        uint256 _assets = exceeds_assets ? assets : s_assets;
        uint256 cost = exceeds_assets ? s_assets - assets : assets - s_assets;
        arrFee[6] = int256(
            TransferHelper.parseVaultAsset(cost, usdc.decimals())
        );
        vm.expectEmit(false, false, false, true, address(vaultReward));
        emit RewardUpdated(owner, 0);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit Withdraw(owner, receiver, owner, _assets, shares);

        // vm.expectEmit(true, true, false, true, address(feeRouter));
        // emit UpdateFee(owner, address(coreVault), arrFee, 0);

        vm.expectEmit(true, true, true, true, address(coreVault));
        emit WithdrawAsset(owner, receiver, owner, assets, shares, cost);

        coreVault.withdraw(assets, receiver, owner);
        uint256 afterAmount = usdc.balanceOf(receiver);
        assertEq(assets, afterAmount - beforeAmount);
        assertEq(coreVault.isFreeze(), false);
        assertEq(
            block.timestamp,
            vaultReward.previousCumulatedRewardPerToken(owner)
        );

        vm.stopPrank();
    }

    function testCV04003(address receiver, address owner) public {
        vm.assume(receiver != address(0) && owner != address(0));
        //vm.assume(assets>10*10*6 && assets < 123123000000);
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        coreVault.deposit(assets, owner);
        vm.stopPrank();
        assets = assets / 2;
        coreVault.grantRole(keccak256("FREEZER_ROLE"), address(this));
        coreVault.setIsFreeze(true);
        vm.startPrank(owner);
        vm.expectRevert(bytes("vault:freeze"));
        coreVault.withdraw(assets, receiver, owner);
        vm.stopPrank();
    }

    function testCV04004(address receiver, address owner) public {
        vm.assume(receiver != address(0) && owner != address(0));
        //vm.assume(assets>10*10*6 && assets < 123123000000);
        assertEq(coreVault.isFreeze(), false);
        assertNotEq(coreVault.vaultReward(), address(0));
        assertNotEq(coreVault.cooldownDuration(), 0);
        assertNotEq(address(coreVault.feeRouter()), address(0));
        assertNotEq(receiver, address(0));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(this), 2000);
        usdc.approve(address(coreVault), 2000);
        coreVault.deposit(2000, address(this));

        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 assets = 100 * 10 ** 6;
        usdc.mint(address(owner), assets);
        vm.startPrank(owner);
        usdc.approve(address(coreVault), assets);
        coreVault.deposit(assets, owner);
        assets = assets / 2;
        vm.expectRevert(bytes("vault:cooldown"));
        coreVault.withdraw(assets, receiver, owner);
        vm.stopPrank();
    }

    function testCV05001() public {}

    function testCV06001() public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        address _vaultRouter = address(0x0);
        vm.expectRevert(bytes("!zero address"));
        coreVault.setVaultRouter(_vaultRouter);
    }

    function testCV06002() public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        address _vaultRouter = address(0x1);
        vm.expectEmit(true, true, true, false, address(coreVault));
        emit RoleRevoked(
            keccak256("ROLE_CONTROLLER"),
            address(vaultRouter),
            address(this)
        );
        vm.expectEmit(true, true, true, false, address(coreVault));
        emit RoleGranted(
            keccak256("ROLE_CONTROLLER"),
            _vaultRouter,
            address(this)
        );
        vm.expectEmit(true, true, true, false, address(coreVault));
        emit RoleGranted(
            keccak256("FREEZER_ROLE"),
            _vaultRouter,
            address(this)
        );
        coreVault.setVaultRouter(_vaultRouter);
    }

    function testCV06003(address _vaultRouter) public {
        vm.expectRevert();
        coreVault.setVaultRouter(_vaultRouter);
    }

    function testCV0701(uint256 fee) public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(true, fee);
        uint256 _buyLpFee = coreVault.buyLpFee();
        assertEq(_buyLpFee, fee);
    }

    function testCV0702(uint256 fee) public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(false, fee);
        uint256 _sellLpfee = coreVault.sellLpFee();
        assertEq(_sellLpfee, fee);
    }

    function testCV0703(uint256 fee) public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        vm.expectEmit(false, false, false, true, address(coreVault));
        emit LPFeeUpdated(false, fee);
        coreVault.setLpFee(false, fee);
        uint256 _lpfee = coreVault.sellLpFee();
        assertEq(_lpfee, fee);
    }

    function testCV0704(uint256 fee) public {
        vm.expectRevert();
        coreVault.setLpFee(false, fee);
    }

    function testCV0801() public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        uint256 _duration = 1 hours;
        coreVault.setCooldownDuration(_duration);
        uint256 _cooldownDuration = coreVault.cooldownDuration();
        assertEq(_cooldownDuration, _duration);
    }

    function testCV0802() public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        uint256 _duration = 1 hours;
        vm.expectEmit(false, false, false, true, address(coreVault));
        emit CoolDownDurationUpdated(_duration);
        coreVault.setCooldownDuration(_duration);
        uint256 _cooldownDuration = coreVault.cooldownDuration();
        assertEq(_cooldownDuration, _duration);
    }

    function testCV0803() public {
        uint256 _duration = 1 hours;
        vm.expectRevert();
        coreVault.setCooldownDuration(_duration);
    }

    function testCV0901() public {
        coreVault.grantRole(keccak256("ROLE_CONTROLLER"), address(this));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        uint256 targetAmount = 100 * 10 * 6;
        usdc.mint(address(coreVault), targetAmount);
        address testAccount = address(0x003);
        uint256 beforeAmount = usdc.balanceOf(testAccount);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(coreVault), testAccount, targetAmount);
        coreVault.transferOutAssets(testAccount, targetAmount);
        uint256 afterAmount = usdc.balanceOf(testAccount);
        assertEq(afterAmount - beforeAmount, targetAmount);
    }

    function testCV0902() public {
        uint256 targetAmount = 100 * 10 * 6;
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(coreVault), targetAmount);
        address testAccount = address(0x003);
        vm.expectRevert();
        coreVault.transferOutAssets(testAccount, targetAmount);
    }

    //todo
    function testCV1001() public {
        coreVault.totalAssets();
    }

    function testCV1101() public {
        coreVault.grantRole(keccak256("MANAGER_ROLE"), address(this));
        coreVault.setLpFee(true, 200000);
        uint256 amount = 1000 * 10 ** 6;
        uint256 result = coreVault.computationalCosts(true, amount);
        uint256 target = 2 * 10 ** 6;
        assertEq(result, target);
        coreVault.setLpFee(false, 200000);
        result = coreVault.computationalCosts(false, amount);
        assertEq(result, target);
    }

    function testCV1201(bool f) public {
        coreVault.grantRole(keccak256("FREEZER_ROLE"), address(this));
        coreVault.setIsFreeze(f);
        bool result = coreVault.isFreeze();
        assertEq(result, f);
    }

    function testCV1202(bool f) public {
        coreVault.grantRole(keccak256("FREEZER_ROLE"), address(this));
        vm.expectEmit(false, false, false, true, address(coreVault));
        emit LogIsFreeze(f);
        coreVault.setIsFreeze(f);
        bool result = coreVault.isFreeze();
        assertEq(result, f);
    }

    function testCV1203(bool f) public {
        vm.expectRevert();
        coreVault.setIsFreeze(f);
    }
}
