const { expect } = require("chai");

const {
  getRewardTracker,
  getRewardToken,
  setTokensPerInterval,
  getTokensPerInterval,
  withdrawToken,
  updateLastDistributionTime,
  distribute,
  pendingRewards,
  getLastDistributionTime,
} = require("../../../../scripts/vault/rewardDistributor");
const {
  deployVaultAllContract,
  getCurrentBlockTimeStamp,
  advanceOneDay,
} = require("../deployContract/deploy");
const { ethers } = require("hardhat");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const {
  updateRewards,
  updateRewardsByAccount,
} = require("../../../../scripts/vault/vaultReward");

describe("rewardDistributor", async function () {
  let owner, second, third, market;

  let allContracts;

  beforeEach(async () => {
    [owner, second, third, market] = await ethers.getSigners();
    allContracts = await deployVaultAllContract(market.address);
  });

  it("updateLastDistributionTime", async function () {
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "VAULT_MGR_ROLE",
      owner.address
    );
    let lastTime = await getLastDistributionTime();
    expect(lastTime).to.be.equal(0);
    await updateLastDistributionTime();

    expect(await getLastDistributionTime()).to.be.equal(
      await getCurrentBlockTimeStamp()
    );
  });

  it("setTokensPerInterval", async function () {
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "MANAGER_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "VAULT_MGR_ROLE",
      owner.address
    );
    await updateLastDistributionTime();
    await setTokensPerInterval(100);
    expect(await getTokensPerInterval()).to.equal(100);
  });

  it("pendingRewards", async () => {
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "MANAGER_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "VAULT_MGR_ROLE",
      owner.address
    );
    await updateLastDistributionTime();
    await setTokensPerInterval(100);
    await advanceOneDay();
    expect(await pendingRewards()).to.be.equal(8640100);
  });

  it("distribute", async function () {

    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "MANAGER_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      allContracts.vaultContracts.rewardDistributor,
      "VAULT_MGR_ROLE",
      owner.address
    );
    await updateLastDistributionTime();
    await setTokensPerInterval(100);
    await advanceOneDay();
    expect(await getRewardTracker()).to.be.equal(
      allContracts.vaultContracts.vaultReward.address
    );
    await updateRewardsByAccount(owner.address);
  });

  it("withdrawToken", async function () {
    //await expect(withdrawToken(usdc.address,user0.address,100)).be.emit(usdc,"Transfer").withArgs(rewardDistributor.address,user0.address,100)
  });
});
