const { grantRoleIfNotGranted } = require("../utils/helpers");
const { deployCoreVault, initCoreVault } = require("./coreVault");
const {
  deployVaultReward,
  initialize: initVaultReward,
} = require("./vaultReward");
const {
  deployVaultRouter,
  initialize: initVaultRouter,
  getFeeRouter,
} = require("./vaultRouter");
const {
  deployRewardDistributor,
  initialize: initDistributor,
} = require("./rewardDistributor");

async function deployVault(
  feeRouterAddr,
  asset,
  name,
  symbol,
  writeJson = true
) {
  const coreVault = await deployCoreVault(writeJson);
  const vaultReward = await deployVaultReward(writeJson);
  const vaultRouter = await deployVaultRouter(writeJson);
  const distributor = await deployRewardDistributor(writeJson);
  await initVaultRouter(coreVault.address, feeRouterAddr);

  await initCoreVault({
    coreVault: coreVault,
    asset,
    name,
    symbol,
    vaultRouterAddr: vaultRouter.address,
    feeRouterAddr,
    vaultRewardAddr: vaultReward.address,
  });
  await initVaultReward(
    coreVault.address,
    vaultRouter.address,
    feeRouterAddr,
    distributor.address
  );

  await initDistributor(asset, vaultReward.address);
  await grantRoleIfNotGranted(
    coreVault,
    "ROLE_CONTROLLER",
    vaultReward.address
  );
  await grantRoleIfNotGranted(
    coreVault,
    "ROLE_CONTROLLER",
    vaultRouter.address
  );

  return {
    coreVault: coreVault,
    vaultReward: vaultReward,
    vaultRouter: vaultRouter,
    rewardDistributor: distributor,
  };
}

module.exports = {
  deployVault,
};
