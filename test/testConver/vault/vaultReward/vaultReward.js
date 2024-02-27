const { expect } = require("chai");
const {
  initialize,
  setAPR,
  buy,
  sell,
  claimLPReward,
  updateRewards,
  getLPReward,
  getLPPrice,
  previewMint,
  previewRedeem,
  getUSDBalance,
  getAUM,
  claimableReward,
  getVaultRouter,
  priceDecimals,
  getSellLpFee,
  getBuyLpFee,
  getAPR,
  tokensPerInterval,
  rewardToken,
  pendingRewards,
  claimable,
  getCoreVault,
  getDistributor,
  getFeeRouter,
} = require("../../../../scripts/vault/vaultReward");

const {
  setTokensPerInterval,
  updateLastDistributionTime,
} = require("../../../../scripts/vault/rewardDistributor");
const {
  deployVaultAllContract,
  advanceOneDay,
} = require("../deployContract/deploy");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const {
  totalSupply,
  balanceOfCoreVault,
} = require("../../../../scripts/vault/coreVault");
const {
  batchMint,
  approve,
  balanceOf,
} = require("../../../../scripts/mocker/USDC");
// const { getVaultRouter } = require('../../../scripts/vault/coreVault');

describe("vaultReward", async function () {
  let owner, second, third, market;

  let allContracts;

  beforeEach(async () => {
    [owner, second, third, market] = await ethers.getSigners();
    allContracts = await deployVaultAllContract(market.address);

    await grantRoleIfNotGranted(
      allContracts.vaultContracts.coreVault,
      "ROLE_CONTROLLER",
      allContracts.vaultContracts.vaultReward.address
    );
    await grantRoleIfNotGranted(
      allContracts.feeContracts.feeRouter,
      "ROLE_CONTROLLER",
      allContracts.vaultContracts.coreVault.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.vaultReward,
      "VAULT_MGR_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "VAULT_MGR_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "VAULT_MGR_ROLE",
      owner.address
    );
  });

  it("setAPR", async function () {
    expect(await getAPR()).to.be.equal(0);
    await setAPR(1);
    expect(await getAPR()).to.equal(1);
  });

  it("buy", async function () {
    let bal = await balanceOfCoreVault(owner.address);
    let lpAmount = 1000 + 500;
    let inputAmount = await previewMint(lpAmount);
    await batchMint([owner.address], inputAmount);
    await approve(allContracts.vaultContracts.vaultReward.address, inputAmount);
    await buy(
      allContracts.vaultContracts.coreVault.address,
      owner.address,
      inputAmount,
      lpAmount
    );
    let afterbal = await balanceOfCoreVault(owner.address);

    expect(afterbal).to.equal(bal.add(lpAmount - 1000));
  });

  it("claimLPReward", async function () {
    let lpAmount = 1500;

    let inputAmount = await previewMint(lpAmount);

    await batchMint([owner.address], inputAmount);
    await approve(allContracts.vaultContracts.vaultReward.address, inputAmount);

    await buy(
      allContracts.vaultContracts.coreVault.address,
      owner.address,
      inputAmount,
      lpAmount
    );

    await advanceOneDay();

    let beforeAmount = await allContracts.vaultContracts.coreVault.balanceOf(
      owner.address
    );
    expect(beforeAmount).to.be.equal(lpAmount - 1000);
    await expect(claimLPReward()).to.be.emit(
      allContracts.vaultContracts.vaultReward,
      "Harvest"
    );
    expect(await balanceOf(owner.address)).to.be.gt(beforeAmount);
  });

  it("claimable", async function () {
    let beforeClaimableReward = await claimableReward(owner.address);

    let lpAmount = 1500;
    let inputAmount = await previewMint(lpAmount);

    await batchMint([owner.address], inputAmount);
    await approve(allContracts.vaultContracts.vaultReward.address, inputAmount);
    await buy(
      allContracts.vaultContracts.coreVault.address,
      owner.address,
      inputAmount,
      lpAmount
    );

    await advanceOneDay();

    await claimable(owner.address);
    expect(await claimableReward(owner.address)).to.be.gte(
      beforeClaimableReward
    );
  });

  it("sell", async function () {
    let lpAmount = 1500;
    let inputAmount = await previewMint(lpAmount);

    await batchMint([owner.address], inputAmount);
    await approve(allContracts.vaultContracts.vaultReward.address, inputAmount);

    await buy(
      allContracts.vaultContracts.coreVault.address,
      owner.address,
      inputAmount,
      lpAmount
    );

    let beforeTotalSupply = await totalSupply();
    let LPAmount = 10;
    await advanceOneDay();
    let outputAmount = await previewRedeem(LPAmount);

    expect(await balanceOfCoreVault(owner.address)).to.be.gt(LPAmount);

    await allContracts.vaultContracts.coreVault.approve(
      allContracts.vaultContracts.vaultReward.address,
      LPAmount
    );
    await sell(
      allContracts.vaultContracts.coreVault.address,
      owner.address,
      LPAmount,
      outputAmount
    );
    expect(await allContracts.vaultContracts.coreVault.totalSupply()).to.equal(
      beforeTotalSupply.sub(LPAmount)
    );
  });

  it("updateRewards", async function () {
    await updateRewards();
  });

  it("pendingRewards", async function () {
    await pendingRewards();
  });

  it("getLPReward", async function () {
    await getLPReward();
  });

  it("getLPPrice", async function () {
    await getLPPrice();
  });

  it("getUSDBalance", async function () {
    //    let  beforeTotalUSD=await getUSDBalance();

    //    let lpAmount=150
    //    let inputAmount=await previewMint(lpAmount);

    //    await allContracts.usdc.batchMint(
    //        [owner.address],
    //        inputAmount
    //    ),
    //    await allContracts.usdc.approve(
    //        allContracts.vaultContracts.vaultReward.address,
    //        inputAmount
    //    )

    //    await buy(
    //        allContracts.vaultContracts.coreVault.address,
    //        owner.address,
    //        inputAmount,
    //        lpAmount,
    //    )

    await getUSDBalance();

    //expect(await getUSDBalance()).to.be.gt(beforeTotalUSD);
  });

  it("getAUM", async function () {
    await getAUM();
  });

  it("priceDecimals", async function () {
    expect(await priceDecimals()).to.equal(8);
  });

  it("getSellLpFee", async function () {
    expect(
      await getSellLpFee(allContracts.vaultContracts.coreVault.address)
    ).to.equal(1000000);
  });

  it("getBuyLpFee", async function () {
    await getBuyLpFee(allContracts.vaultContracts.coreVault.address);
  });

  it("tokensPerInterval", async function () {
    await updateLastDistributionTime();
    await setTokensPerInterval(100);
    expect(await tokensPerInterval()).to.equal(100);
  });

  it("rewardToken", async function () {
    expect(await rewardToken()).to.be.equal(allContracts.usdc.address);
  });
});
