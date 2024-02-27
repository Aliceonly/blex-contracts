const { readTokenContract } = require("../mock/erc20");
const {
  deployOrConnect,
  waitTx,
  grantRoleIfNotGranted,
} = require("../utils/helpers");
const {
  deployCoreVault,
  initCoreVault,
  readCoreVaultContract,
} = require("../vault/coreVault");
const { readRewardDistributorContract } = require("../vault/rewardDistributor");
const {
  initializeVaultReward,
  deployVaultReward,
  readVaultRewardContract,
} = require("../vault/vaultReward");
const {
  initializeVaultRouter,
  deployVaultRouter,
  readVaultRouterContract,
} = require("../vault/vaultRouter");
const { deployRewardDistributor } = require("../vault/rewardDistributor");
const { utils } = require("ethers");

// call this function need deploy usdc first
async function deployAll(usdc, isInit = true) {
  const vault = await deployCoreVault();
  const vaultRouter = await deployVaultRouter();
  const vaultReward = await deployVaultReward();
  const rewardDistributor = await deployRewardDistributor();

  const initLP = async ({
    USDC,
    name,
    symbol,
    vault,
    vaultRouter,
    vaultReward,
    feeRouter,
    rewardDistributor,
  } = {}) => {
    await initializeVaultRouter(vault.address, feeRouter.address, vaultRouter);

    await initializeVaultReward(
      vault.address,
      vaultRouter.address,
      feeRouter.address,
      rewardDistributor.address,
      vaultReward
    );

    await waitTx(
      rewardDistributor.initialize(USDC.address, vaultReward.address),
      "rewardDistributor.init"
    );

    await initCoreVault({
      coreVault: vault,
      asset: USDC.address,
      name,
      symbol,
      vaultRouterAddr: vaultRouter.address,
      feeRouterAddr: feeRouter.address,
      vaultRewardAddr: vaultReward.address,
    });

    await grantRoleIfNotGranted(vault, "ROLE_CONTROLLER", vaultReward.address);
    await grantRoleIfNotGranted(vault, "ROLE_CONTROLLER", vaultRouter.address);
  };

  return {
    vaultRouter,
    collateralToken: usdc,
    vault,
    vaultReward,
    initLP,
    setMarketLP,
    rewardDistributor,
  };
}



async function readLpContract() {
  const vault = await readCoreVaultContract();

  const vaultRouter = await readVaultRouterContract();
  const vaultReward = await readVaultRewardContract();
  const rewardDistributor = await readRewardDistributorContract();

  return {
    vault: vault,
    vaultRouter: vaultRouter,
    vaultReward: vaultReward,
    rewardDistributor: rewardDistributor,
  };
}

async function setMarketLP({ market, vault, vaultRouter, user } = {}) {
  return;
  if (user == null) {
    return waitTx(
      vaultRouter.setMarket(market.address, vault.address),
      "vaultRouter.setMarket"
    );
  }
  return waitTx(
    vaultRouter.connect(user).setMarket(market.address, vault.address),
    "vaultRouter.setMarket"
  );
}

module.exports = {
  deployAll,
  readLpContract,
};
