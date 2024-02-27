// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {Vm} from "../../../../lib/forge-std/src/Vm.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {IERC4626} from "../../../../contracts/vault/ERC4626.sol";
import {IERC20} from "../../../../contracts/vault/ERC20.sol";

import {CoreVault, ICoreVault} from "../../../../contracts/vault/CoreVault.sol";
import {USDC} from "../../../../contracts/mocker/USDC.sol";

import {FundFee} from "../../../../contracts/fee/FundFee.sol";
import {FeeVault} from "../../../../contracts/fee/FeeVault.sol";
import {FeeRouter} from "../../../../contracts/fee/FeeRouter.sol";

import {console2} from "../../../../lib/forge-std/src/console2.sol";
import {Test} from "../../../../lib/forge-std/src/Test.sol";
import {VaultRouter} from "../../../../contracts/vault/VaultRouter.sol";
import {MockMarket} from "../../../../contracts/mocker/MockMarket.sol";
import {MockVaultRewardForCoreVault} from "../../../../contracts/mocker/MockVaultRewardForCoreVault.sol";
import {MockRewardDistributor} from "../../../../contracts/mocker/MockRewardDistributor.sol";
import {MockFeeRouter} from "../../../../contracts/mocker/MockFeeRouter.sol";

contract MockDocsVaultRouterTest is Test {
    CoreVault coreVault;
    MockRewardDistributor rewardDistributor;
    MockVaultRewardForCoreVault vaultReward;
    VaultRouter vaultRouter;

    MockFeeRouter feeRouter;
    USDC usdc;
    MockMarket mockMarket;
    event MarketSetted(address market, address vault);
    event MarketRemoved(address market, address vault);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event LogIsFreeze(bool isFreeze, uint256 freezeType);
    event FundsUsedUpdated(
        address indexed market,
        uint256 amount,
        uint256 totalFundsUsed
    );

    function setUp() public {
        usdc = new USDC("USDC", "USDC", 10000000);
        coreVault = new CoreVault();
        vaultRouter = new VaultRouter();
        rewardDistributor = new MockRewardDistributor();
        vaultReward = new MockVaultRewardForCoreVault();

        feeRouter = new MockFeeRouter();
        // feeVault = new FeeVault();
        // fundFee = new FundFee(address(feeVault)s);
        mockMarket = new MockMarket();
        coreVault.initialize(
            address(usdc),
            "CoreVault",
            "CoreVault",
            address(vaultRouter),
            address(feeRouter),
            address(vaultReward)
        );
        vaultRouter.initialize(address(coreVault), address(feeRouter));
        // vaultRouter.grantRole(bytes32(keccak256("MULTI_SIGN_ROLE")),address(this));
        // vaultRouter.grantRole(bytes32(keccak256("VAULT_MGR_ROLE")),address(this));
    }

    function testVR01001() public {
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );
        ICoreVault vault = vaultRouter.marketVaults(address(mockMarket));
        assertEq(address(vault), address(0x0));
        vm.expectEmit(false, false, false, true, address(vaultRouter));
        emit MarketSetted(address(mockMarket), address(coreVault));
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vault = vaultRouter.marketVaults(address(mockMarket));
        assertEq(address(vault), address(coreVault));
    }

    function testVR01002() public {
        vm.startPrank(address(0x1));
        vm.expectRevert();
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
    }

    function testVR01003() public {
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vm.expectRevert();
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
    }

    function testVR02001() public {
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        ICoreVault vault = vaultRouter.marketVaults(address(mockMarket));
        vaultRouter.grantRole(
            bytes32(keccak256("VAULT_MGR_ROLE")),
            address(this)
        );
        vm.expectEmit(false, false, false, true, address(vaultRouter));
        emit MarketRemoved(address(mockMarket), address(coreVault));
        vaultRouter.removeMarket(address(mockMarket));
        vault = vaultRouter.marketVaults(address(mockMarket));
        assertEq(address(vault), address(0x0));
    }

    function testVR02002() public {
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        ICoreVault vault = vaultRouter.marketVaults(address(mockMarket));
        assertEq(address(vault), address(coreVault));
        vm.startPrank(address(0x7));
        vm.expectRevert();
        vaultRouter.removeMarket(address(mockMarket));
    }

    function testVR03001(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(mockMarket), amount);
        vm.startPrank(address(mockMarket));
        usdc.approve(address(vaultRouter), amount);
        uint256 beforeAccountAmount = usdc.balanceOf(address(mockMarket));
        uint256 beforeVaultAmount = usdc.balanceOf(address(coreVault));
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(mockMarket), address(coreVault), amount);
        vaultRouter.transferToVault(address(mockMarket), amount);
        uint256 afterAccountAmount = usdc.balanceOf(address(mockMarket));
        uint256 afterVaultAmount = usdc.balanceOf(address(coreVault));

        assertEq(beforeAccountAmount - afterAccountAmount, amount);
        assertEq(afterVaultAmount - beforeVaultAmount, amount);
        vm.stopPrank();
    }

    function testVR03002(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("FREEZER_ROLE")),
            address(this)
        );
        vm.expectEmit(false, false, false, true, address(vaultRouter));
        emit LogIsFreeze(true, 1);
        vaultRouter.setIsFreeze(true, 1);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(mockMarket), amount);
        vm.startPrank(address(mockMarket));
        usdc.approve(address(vaultRouter), amount);
        vm.expectRevert(bytes("VaultRouter:freeze"));
        vaultRouter.transferToVault(address(mockMarket), amount);
        vm.stopPrank();
    }

    function testVR03003() public {
        vm.startPrank(address(0x02));
        vm.expectRevert();
        vaultRouter.transferToVault(address(mockMarket), 1000 * 10 ** 6);
    }

    function testVR03004(uint256 amount) public {
        vm.assume(amount > 0 && amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(mockMarket), amount);
        vm.startPrank(address(mockMarket));
        // usdc.approve(address(vaultRouter), amount);
        vm.expectRevert();
        vaultRouter.transferToVault(address(mockMarket), amount);
        vm.stopPrank();
    }

    function testVR04001(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(coreVault), amount);
        vm.startPrank(address(coreVault));
        uint256 beforeAccountAmount = usdc.balanceOf(address(mockMarket));
        uint256 beforeVaultAmount = usdc.balanceOf(address(coreVault));
        usdc.approve(address(vaultRouter), amount);

        vm.stopPrank();
        vm.startPrank(address(mockMarket));
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(coreVault), address(mockMarket), amount);
        vaultRouter.transferFromVault(address(mockMarket), amount);
        uint256 afterAccountAmount = usdc.balanceOf(address(mockMarket));
        uint256 afterVaultAmount = usdc.balanceOf(address(coreVault));
        assertEq(afterAccountAmount - beforeAccountAmount, amount);
        assertEq(beforeVaultAmount - afterVaultAmount, amount);
        vm.stopPrank();
    }

    function testVR04002(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("FREEZER_ROLE")),
            address(this)
        );
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vm.expectEmit(false, false, false, true, address(vaultRouter));
        emit LogIsFreeze(true, 1);
        vaultRouter.setIsFreeze(true, 1);
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(coreVault), amount);
        vm.startPrank(address(coreVault));
        usdc.approve(address(vaultRouter), amount);
        vm.stopPrank();
        vm.startPrank(address(mockMarket));
        vm.expectRevert(bytes("VaultRouter:freeze"));
        vaultRouter.transferFromVault(address(mockMarket), amount);
        vm.stopPrank();
    }

    function testVR04003() public {
        vm.startPrank(address(0x02));
        vm.expectRevert();
        vaultRouter.transferFromVault(address(mockMarket), 1000 * 10 ** 6);
    }

    function testVR05001(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vm.startPrank(address(mockMarket));
        uint256 _totalFundsUsed = vaultRouter.totalFundsUsed() + amount;
        uint256 marketUsed = vaultRouter.fundsUsed(address(mockMarket)) +
            amount;
        vm.expectEmit(true, false, false, true, address(vaultRouter));
        emit FundsUsedUpdated(address(mockMarket), marketUsed, _totalFundsUsed);
        vaultRouter.borrowFromVault(amount);
        vm.stopPrank();
    }

    function testVR05002(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vaultRouter.grantRole(
            bytes32(keccak256("FREEZER_ROLE")),
            address(this)
        );
        vm.expectEmit(false, false, false, true, address(vaultRouter));
        emit LogIsFreeze(true, 2);
        vaultRouter.setIsFreeze(true, 2);
        vm.startPrank(address(mockMarket));
        vm.expectRevert(bytes("VaultRouter:freeze"));
        vaultRouter.borrowFromVault(amount);
    }

    function testVR05003(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vm.startPrank(address(0x002));
        vm.expectRevert("VaultRouter:!market");
        vaultRouter.borrowFromVault(amount);
        vm.stopPrank();
    }

    function testVR06001(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vm.startPrank(address(mockMarket));
        vaultRouter.borrowFromVault(amount);
        uint256 totalFundsUsed = vaultRouter.totalFundsUsed() - amount;
        uint256 marketUsed = vaultRouter.fundsUsed(address(mockMarket)) -
            amount;
        vm.expectEmit(true, false, false, true, address(vaultRouter));
        emit FundsUsedUpdated(address(mockMarket), marketUsed, totalFundsUsed);
        vaultRouter.repayToVault(amount);
        vm.stopPrank();
    }

    function testVR06002(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vaultRouter.grantRole(
            bytes32(keccak256("FREEZER_ROLE")),
            address(this)
        );
        vm.expectEmit(false, false, false, true, address(vaultRouter));
        emit LogIsFreeze(true, 2);
        vaultRouter.setIsFreeze(true, 2);
        vm.startPrank(address(mockMarket));
        vm.expectRevert(bytes("VaultRouter:freeze"));
        vaultRouter.repayToVault(amount);
        vm.stopPrank();
    }

    function testVR06003(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vm.startPrank(address(mockMarket));
        vaultRouter.borrowFromVault(amount);
        vm.stopPrank();
        vm.startPrank(address(0x002));
        vm.expectRevert("VaultRouter:!market");
        vaultRouter.repayToVault(amount);
        vm.stopPrank();
    }

    function testVR07001(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(coreVault), amount);
        uint totalAsset = vaultRouter.getUSDBalance();
        assertEq(totalAsset, amount);
    }

    function testVR08001(uint256 amount) public {
        vm.assume(amount < 100000000000000 * 10 ** 6);
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );

        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        usdc.grantRole(keccak256("MINTER_ROLE"), address(this));
        usdc.mint(address(mockMarket), amount);
        vaultRouter.getGlobalPnl();
    }

    function testVR09001() public {
        vaultRouter.sellLpFee(coreVault);
    }

    function testVR10001() public {
        vaultRouter.buyLpFee(coreVault);
    }

    function testVR11001() public {
        vaultRouter.priceDecimals();
    }

    function testVR1201() public {
        vaultRouter.grantRole(
            bytes32(keccak256("MULTI_SIGN_ROLE")),
            address(this)
        );
        vaultRouter.setMarket(address(mockMarket), address(coreVault));
        vaultRouter.getAUM();
    }
}
