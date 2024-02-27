// const { deployCoreVault } = require("../../scripts/vault/coreVault")

const { ethers } = require("hardhat");
const { deployFee } = require("../../../../scripts/fee/deployFeeAll");
const { deployFeeRouter } = require("../../../../scripts/fee/feeRouter");
const {
  deployMarketFactory,
} = require("../../../../scripts/market/marketFactory");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const {
  deployCoreVault,
  initialize,
} = require("../../../../scripts/vault/coreVault");
const { deployVault } = require("../../../../scripts/vault/deploy");
const {
  deployRewardDistributor,
} = require("../../../../scripts/vault/rewardDistributor");
const { deployUSDC, batchMint } = require("../../../../scripts/mocker/USDC");
const { deployVaultReward } = require("../../../../scripts/vault/vaultReward");
const { deployVaultRouter } = require("../../../../scripts/vault/vaultRouter");

async function deployVaultAllContract(factoryAddr) {
  let feeContracts = await deployFee(factoryAddr, true, true);
  // console.log("feeContracts.feeRouter.address",await feeContracts.feeRouter.feeRouter())
  let usdc = await deployUSDC("USDC", "USDC", 1000000000);
  let owner = await ethers.getSigner();

  let vaultContracts = await deployVault(
    feeContracts.feeRouter.address,
    usdc.address,
    "LP",
    "LP"
  );

  await grantRoleIfNotGranted(usdc, "MINTER_ROLE", owner.address);
  //vaultContracts.coreVault.address
  await batchMint([vaultContracts.coreVault.address], 10000000);

  // console.log()

  return {
    feeContracts: feeContracts,
    usdc: usdc,
    vaultContracts: vaultContracts,
  };
}
async function getCurrentBlockTimeStamp() {
  const provider = waffle.provider; // ethers.provider
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  console.log(`Block ${blockNumber} timestamp: ${block.timestamp}`);
  return block.timestamp;
}

async function advanceTimeStamp(ts) {
  const previousTS = await getCurrentBlockTimeStamp();
  const provider = waffle.provider; // ethers.provider
  await provider.send("evm_setNextBlockTimestamp", [previousTS + ts]);
  await provider.send("evm_mine");
  await getCurrentBlockTimeStamp();
}
async function advanceOneDay() {
  await advanceTimeStamp(86400);
}

module.exports = {
  deployVaultAllContract,
  getCurrentBlockTimeStamp,
  advanceOneDay,
};
