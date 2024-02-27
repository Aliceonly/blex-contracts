const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  grantRoleIfNotGranted,
  writeContractAddresses,
  deployUpgradeable,
  getContractAt,
  readUpgradableDeployedContract,
} = require("../utils/helpers");

async function deployVaultRouter(writeJson = true) {
  const { implementation, proxy, receipt } = await deployUpgradeable(
    "VaultRouter",
    "VaultRouter"
  );
  const result = {
    VaultRouter: proxy.address,
    ["VaultRouterImpl"]: implementation.address,
    ["VaultRouter_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return getContractAt("VaultRouter", proxy.address);
}

async function readVaultRouterContract() {
  // const vaultRouter = await readDeployedContract("VaultRouter");
  // return vaultRouter;
  const vault = await readUpgradableDeployedContract("VaultRouter");
  return vault;
}

async function initialize(coreVaultAddr, feeRouterAddr) {
  const vaultRouter = await readVaultRouterContract();
  await handleTx(
    vaultRouter.initialize(coreVaultAddr, feeRouterAddr),
    "vaultRouter.initialize"
  );
}

async function initializeVaultRouter(
  coreVaultAddr,
  feeRouterAddr,
  vaultRouter = null
) {
  if (null == vaultRouter) vaultRouter = await readVaultRouterContract();
  await handleTx(
    vaultRouter.initialize(coreVaultAddr, feeRouterAddr),
    "vaultRouter.initialize"
  );
}

async function getFeeRouter() {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.feeRouter();
}

async function setIsFreeze(isFreeze, freezeType) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.setIsFreeze(isFreeze, freezeType);
  //await handleTx(vaultRouter.setIsFreeze(isFreeze), "vaultRouter.setIsFreeze");
}

async function setMarket(marketAddr, vaultAddr) {
  // return; 
  const vaultRouter = await readVaultRouterContract();

  // await grantRoleIfNotGranted(
  //   vaultRouter,
  //   "ROLE_CONTROLLER",
  //   market,
  //   "feeRouter.grant.market"
  // );
  return await handleTx(
    vaultRouter.setMarket(marketAddr, vaultAddr),
    "vault.setMarket"
  );
}

async function removeMarket(marketAddr) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.removeMarket(marketAddr);
  // await handleTx(
  //   vaultRouter.removeMarket(marketAddr),
  //   "vaultRouter.removeMarket"
  // );
}

async function transferToVault(account, amount) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.transferToVault(account, amount);
  // await handleTx(
  //   vaultRouter.transferToVault(account, amount),
  //   "vaultRouter.transferToVault"
  // );
}

async function totalFundsUsed() {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.totalFundsUsed();
}

async function transferFromVault(toAccount, account) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.transferFromVault(toAccount, account);
  // await handleTx(
  //   vaultRouter.transferFromVault(toAccount, account),
  //   "vaultRouter.transferFromVault"
  // );
}

async function borrowFromVault(amount) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.borrowFromVault(amount);
  // await handleTx(
  //   vaultRouter.borrowFromVault(amount),
  //   "vaultRouter.borrowFromVault"
  // );
}

async function repayToVault(amount) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.repayToVault(amount);
  // await handleTx(vaultRouter.repayToVault(amount), "vaultRouter.repayToVault");
}

async function getUSDBalance() {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.getUSDBalance();
}

async function getGlobalPnl() {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.getGlobalPnl();
}

async function getAUM() {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.getAUM();
}

async function priceDecimals() {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.priceDecimals();
}

async function sellLpFee(vaultAddr) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.sellLpFee(vaultAddr);
}

async function buyLpFee(vaultAddr) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.buyLpFee(vaultAddr);
}

async function getMarketVaults(market) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.marketVaults(market);
}

async function isFreeze() {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.isFreezeTransfer();
}

async function getMarketFundsUsed(market) {
  const vaultRouter = await readVaultRouterContract();
  return await vaultRouter.fundsUsed(market);
}
//marketVaults
async function getMarketVaultsVaultRouter(market) {
  const vaultRouter = await readVaultRouterContract();
  console.log("market", market);

  return await vaultRouter.marketVaults(market);
}

module.exports = {
  deployVaultRouter,
  readVaultRouterContract,
  initialize,
  setIsFreeze,
  getFeeRouter,
  isFreeze,
  totalFundsUsed,
  getMarketVaults,
  setMarket,
  removeMarket,
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
  initializeVaultRouter,
  getMarketFundsUsed,
  getMarketVaultsVaultRouter,
};
