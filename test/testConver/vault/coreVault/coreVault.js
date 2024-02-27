const { expect } = require("chai");

const {
  getCooldownDuration,
  setVaultRouter,
  getVaultRouter,
  setLpFee,
  setCooldownDuration,
  setIsFreeze,
  getIsFreeze,
  transferOutAssets,
  computationalCosts,
  verifyOutAssets,
  getTotalAssets,
  getLPFee,
  decimals,
  getAsset,
  convertToShares,
  convertToAssets,
  maxDeposit,
  maxMint,
  maxWithdraw,
  maxRedeem,
  previewDeposit,
  previewMint,
  previewWithdraw,
  previewRedeem,
  deposit,
  balanceOfCoreVault,
  mint,
} = require("../../../../scripts/vault/coreVault");
const { deployVaultAllContract } = require("../deployContract/deploy");
const { ethers } = require("hardhat");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const {
  batchMint,
  approve,
  balanceOf,
  connectApprove,
} = require("../../../../scripts/mocker/USDC");
const { setMarket } = require("../../../../scripts/vault/vaultRouter");
const {
  deployMarket,
  connectDeposit,
} = require("../../../../scripts/mock/market");
const {
  deployMockMarketFactoryContract,
  setMarketMockMarketFactoryContract,
} = require("../../../../scripts/mock/marketFactory");

describe("coreVault", function () {
  let owner, second, third, market;
  let allContracts;

  beforeEach(async () => {
    [owner, second, third] = await ethers.getSigners();
    let factory = await deployMockMarketFactoryContract();
    allContracts = await deployVaultAllContract(factory.address);

    market = await deployMarket();

    await setMarketMockMarketFactoryContract("ETH", market.address);

    await grantRoleIfNotGranted(
      allContracts.vaultContracts.vaultRouter,
      "MULTI_SIGN_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.feeContracts.feeRouter,
      "ROLE_CONTROLLER",
      allContracts.vaultContracts.coreVault.address
    );

    await grantRoleIfNotGranted(
      allContracts.vaultContracts.coreVault,
      "ROLE_CONTROLLER",
      owner.address
    );

    await grantRoleIfNotGranted(
      allContracts.vaultContracts.coreVault,
      "MANAGER_ROLE",
      owner.address
    );

    await setMarket(
      market.address,
      allContracts.vaultContracts.coreVault.address
    );
  });

  it("preMint && Mint", async () => {
    let preMint = await previewMint(1000 + 1000);
    console.log(preMint);
    let bal = await balanceOfCoreVault(owner.address);
    await batchMint([owner.address], preMint);

    await approve(allContracts.vaultContracts.coreVault.address, preMint);

    await mint(1000 + 1000, owner.address);

    expect(await balanceOfCoreVault(owner.address)).to.be.eq(bal.add(1000));
  });

  it("test case", async function () {
    let users = [owner, second, third];

    for (let index = 0; index < users.length; index++) {
      // console.log(index);
      let preD = await previewDeposit(10000);
      let bal = await balanceOfCoreVault(users[index].address);
      await batchMint([users[index].address, market.address], 10000);
      // await connectApprove(users[index], market.address, 10000);

      console.log(market.address);

      await connectDeposit(
        users[index],
        allContracts.usdc.address,
        allContracts.vaultContracts.coreVault.address,
        10000,
        users[index].address
      );

      if (0 === index) {
        expect(await balanceOfCoreVault(users[index].address)).to.be.eq(
          bal.add(preD.sub(1000))
        );
      } else {
        expect(await balanceOfCoreVault(users[index].address)).to.be.eq(
          bal.add(preD)
        );
      }
    }
  });

  it("setVaultRouter", async function () {
    await setVaultRouter(allContracts.vaultContracts.vaultRouter.address);
    expect(await getVaultRouter()).to.equal(
      allContracts.vaultContracts.vaultRouter.address
    );
  });

  it("setLpFee", async function () {
    await expect(setLpFee(false, 100))
      .to.be.emit(allContracts.vaultContracts.coreVault, "LPFeeUpdated")
      .withArgs(false, 100);
    expect(await getLPFee(false)).to.equal(100);
  });

  it("getLPFee", async function () {
    expect(await getLPFee(true)).to.be.equal(0);
    await setLpFee(true, 500);
    expect(await getLPFee(true)).to.be.equal(500);
  });

  it("setCooldownDuration", async function () {
    let beforeTimeDuration = 15 * 60;
    let atferTimeDuration = 15 * 2 * 60 * 60;

    expect(await getCooldownDuration()).to.equal(beforeTimeDuration);
    await setCooldownDuration(atferTimeDuration);
    expect(await getCooldownDuration()).to.equal(atferTimeDuration);
  });

  it("setIsFreeze", async function () {
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.coreVault,
      "FREEZER_ROLE",
      owner.address
    );
    expect(await getIsFreeze()).to.be.equal(false);
    await setIsFreeze(true);
    expect(await getIsFreeze()).to.be.equal(true);
    await setIsFreeze(false);
    expect(await getIsFreeze()).to.be.equal(false);
  });

  it("transferOutAssets", async function () {
    await transferOutAssets(owner.address, 100);
  });

  //todo
  it("computationalCosts", async function () {
    expect(await computationalCosts(true, 100)).to.be.equal(0);
    expect(await computationalCosts(false, 100)).to.be.equal(1);
  });

  //   it("verifyOutAssets", async function () {
  //     expect(await verifyOutAssets(owner.address, 100000)).to.be.equal(true);
  //   });

  //redeem  withdraw  mint  deposit

  it("previewRedeem", async () => {
    await previewRedeem(100);
  });

  it("previewWithdraw", async () => {
    await previewWithdraw(100);
  });

  it("previewMint", async () => {
    await previewMint(100);
  });

  it("previewDeposit", async () => {
    await previewDeposit(100);
  });

  it("maxRedeem", async () => {
    await maxRedeem(owner.address);
  });

  it("maxWithdraw", async () => {
    await maxWithdraw(owner.address);
  });

  it("maxMint", async () => {
    await maxMint(owner.address);
  });

  it("maxDeposit", async () => {
    await maxDeposit(owner.address);
  });

  it("convertToAssets", async () => {
    await convertToAssets(100);
  });

  it("convertToShares", async () => {
    await convertToShares(100);
  });

  it("getTotalAssets", async function () {
    expect(await getTotalAssets()).to.be.equal(10000000);
  });

  it("asset", async () => {
    await getAsset();
  });

  it("decimals", async () => {
    await decimals();
  });
});
