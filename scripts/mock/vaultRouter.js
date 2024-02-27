const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployMockVaultRouter(writeJson = true) {
  const router = await deployOrConnect("MockVaultRouter", []);
  const result = {
    MockVaultRouter: router.address,
  };

  if (writeJson) writeContractAddresses(result);

  return router;
}

async function readVaultRouterContract() {
  const router = await readDeployedContract("MockVaultRouter");
  return router;
}

async function setFundLimit(limit) {
  const router = await deployOrConnect("MockVaultRouter", []);
  await handleTx(router.setFundLimit(limit), "vaultRouter.setFundLimit");
}

async function setUSDBalance(amount) {
  const router = await deployOrConnect("MockVaultRouter", []);
  await handleTx(router.setUSDBalance(amount), "vaultRouter.setUSDBalance");
}

async function getMarketFundsUsed(account) {
  const router = await readDeployedContract("MockVaultRouter");
  return await router.fundsUsed(account);
}

async function getTemAddress() {
  const router = await readDeployedContract("MockVaultRouter");
  return await router.temAddress();
}

module.exports = {
  deployMockVaultRouter,
  readVaultRouterContract,
  setFundLimit,
  setUSDBalance,
  getMarketFundsUsed,
  getTemAddress,
};
