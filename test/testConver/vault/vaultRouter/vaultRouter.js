const { expect } = require("chai");
const {
  isFreeze,
  setIsFreeze,
  totalFundsUsed,
  setMarket,
  transferToVault,
  transferFromVault,
  borrowFromVault,
  repayToVault,
  getUSDBalance,
  getGlobalPnl,
  getAUM,
  priceDecimals,
  sellLpFee,
  buyLpFee,
  removeMarket,
  getMarketVaults,
} = require("../../../../scripts/vault/vaultRouter");

const { previewMint } = require("../../../../scripts/vault/vaultReward");

const { buy } = require("../../../../scripts/vault/vaultReward");

const {
  batchMint,
  readUSDCContract,
  balanceOf,
  approve,
} = require("../../../../scripts/mocker/USDC");

const { deployVaultAllContract } = require("../deployContract/deploy");
const { ethers } = require("hardhat");
const {
  readCoreVaultContract,
} = require("../../../../scripts/vault/coreVault");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const {
  deployMarket,
  borrowFromVaultMockMarket,
  transferToVaultMockMarket,
  repayToVaultMockMarket,
} = require("../../../../scripts/mock/market");
// const { approve } = require("../../../../scripts/mock/erc20");

describe("vaultRouter", async function () {
  let owner, second, third;
  let market;

  let allContracts;
  beforeEach(async () => {
    [owner, second, third] = await ethers.getSigners();
    allContracts = await deployVaultAllContract(owner.address);
    market = await deployMarket();

    await grantRoleIfNotGranted(
      allContracts.vaultContracts.vaultRouter,
      "ROLE_CONTROLLER",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.vaultReward,
      "ROLE_CONTROLLER",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.vaultRouter,
      "VAULT_MGR_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.vaultRouter,
      "MULTI_SIGN_ROLE",
      owner.address
    );
  });

  it("setIsFreeze", async function () {
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.vaultRouter,
      "FREEZER_ROLE",
      owner.address
    );
    expect(await isFreeze()).to.equal(false);
    await setIsFreeze(true, 1);
    // expect(await isFreeze()).to.equal(true);
    // await setIsFreeze(false);
  });

  it("setMarket", async function () {
    let vault = await getMarketVaults(market.address);
    expect(vault).to.equal(ethers.constants.AddressZero);
    await setMarket(
      market.address,
      allContracts.vaultContracts.coreVault.address
    );
    vault = await getMarketVaults(market.address);
    expect(vault).to.equal(allContracts.vaultContracts.coreVault.address);
  });

  it("removeMarket", async function () {
    let vault = await getMarketVaults(market.address);
    expect(vault).to.equal(ethers.constants.AddressZero);
    await setMarket(
      market.address,
      allContracts.vaultContracts.coreVault.address
    );
    vault = await getMarketVaults(market.address);
    expect(vault).to.equal(allContracts.vaultContracts.coreVault.address);
    await removeMarket(market.address);
    expect(await getMarketVaults(market.address)).to.equal(
      ethers.constants.AddressZero
    );
  });

  it("transferToVault", async function () {
    await batchMint([owner.address], 1000);

    let beforeValue = await balanceOf(owner.address);
    await setMarket(
      owner.address,
      allContracts.vaultContracts.coreVault.address
    );
    await approve(allContracts.vaultContracts.vaultRouter.address, 100);

    await transferToVault(owner.address, 100);
    expect(await balanceOf(owner.address)).to.be.equal(beforeValue.sub(100));
  });

  it("transferFromVault", async function () {
    await batchMint([owner.address], 1000);

    await setMarket(
      owner.address,
      allContracts.vaultContracts.coreVault.address
    );
    await approve(allContracts.vaultContracts.vaultRouter.address, 100);

    await transferToVault(owner.address, 100);

    let beforeValue = await balanceOf(owner.address);
    await transferFromVault(owner.address, 100);

    expect(await balanceOf(owner.address)).to.be.equal(beforeValue.add(100));
  });

  it("borrowFromVault", async function () {
    //todo
    await batchMint([owner.address], 1000);

    await setMarket(
      market.address,
      allContracts.vaultContracts.coreVault.address
    );
    await approve(allContracts.vaultContracts.vaultRouter.address, 100);

    await transferToVaultMockMarket(
      allContracts.vaultContracts.vaultRouter.address,
      owner.address,
      100
    );

    let beforeFundsUsed = await totalFundsUsed();

    await borrowFromVaultMockMarket(
      allContracts.vaultContracts.vaultRouter.address,
      10
    );

    let afterFundsUsed = await totalFundsUsed();

    expect(afterFundsUsed).to.equal(beforeFundsUsed.add(10));
  });

  it("repayToVault", async function () {
    //todo
    await batchMint([owner.address], 1000);

    await setMarket(
      market.address,
      allContracts.vaultContracts.coreVault.address
    );
    await approve(allContracts.vaultContracts.vaultRouter.address, 100);

    await transferToVaultMockMarket(
      allContracts.vaultContracts.vaultRouter.address,
      owner.address,
      100
    );

    let beforeFundsUsed = await totalFundsUsed();

    await borrowFromVaultMockMarket(
      allContracts.vaultContracts.vaultRouter.address,
      10
    );

    let afterFundsUsed = await totalFundsUsed();

    expect(afterFundsUsed).to.equal(beforeFundsUsed.add(10));

    await repayToVaultMockMarket(
      allContracts.vaultContracts.vaultRouter.address,
      10
    );

    afterFundsUsed = await totalFundsUsed();

    expect(afterFundsUsed).to.be.eq(beforeFundsUsed);
  });

  it("getUSDBalance", async function () {
    await getUSDBalance();
  });
  it("getGlobalPnl", async function () {
    await getGlobalPnl();
  });

  it("getAUM", async function () {
    await getAUM();
  });

  it("priceDecimals", async function () {
    await priceDecimals();
  });

  it("sellLpFee", async function () {
    await sellLpFee(allContracts.vaultContracts.coreVault.address);
  });

  it("buyLpFee", async function () {
    await buyLpFee(allContracts.vaultContracts.coreVault.address);
  });
});
