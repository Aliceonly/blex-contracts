const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  deployUpgradeable,
  getContractAt,
  handleTx,
} = require("../utils/helpers");

async function deployVaultReward(writeJson = true) {
  const { implementation, proxy, receipt } = await deployUpgradeable(
    "VaultReward",
    "VaultReward"
  );
  const result = {
    VaultReward: proxy.address,
    ["VaultRewardImpl"]: implementation.address,
    ["VaultReward_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return getContractAt("VaultReward", proxy.address);
}

async function readVaultRewardContract() {
  const reward = await readDeployedContract("VaultReward");
  return reward;
}

async function initialize(
  coreVaultAddr,
  vaultRouterAddr,
  feeRouterAddr,
  distributorAddr
) {
  const reward = await readVaultRewardContract();
  await handleTx(
    reward.initialize(
      coreVaultAddr,
      vaultRouterAddr,
      feeRouterAddr,
      distributorAddr
    ),
    "reward.initialize"
  );
}

async function initializeVaultReward(
  coreVaultAddr,
  vaultRouterAddr,
  feeRouterAddr,
  distributorAddr,
  vaultReward = null
) {
  if (null == vaultReward) vaultReward = await readVaultRewardContract();
  await handleTx(
    vaultReward.initialize(
      coreVaultAddr,
      vaultRouterAddr,
      feeRouterAddr,
      distributorAddr
    ),
    "reward.initialize"
  );
}

async function getFeeRouter() {
  const reward = await readVaultRewardContract();
  return await reward.feeRouter();
}
async function getCoreVault() {
  const reward = await readVaultRewardContract();
  return await reward.coreVault();
}
async function getVaultRouter() {
  const reward = await readVaultRewardContract();
  return await reward.vaultRouter();
}

async function getDistributor() {
  const reward = await readVaultRewardContract();

  return await reward.distributor();
}

async function getCumulativeRewardPerToken() {
  const reward = await readVaultRewardContract();

  return await reward.cumulativeRewardPerToken();
}

async function buy(vaultAddr, toAddr, amount, minSharesOut) {
  const reward = await readVaultRewardContract();

  return await handleTx(
    reward.buy(vaultAddr, toAddr, amount, minSharesOut),
    "reward.buy"
  );
}

async function sell(vaultAddr, toAddr, amount, minAssetsOut) {
  const reward = await readVaultRewardContract();
  return await reward.sell(vaultAddr, toAddr, amount, minAssetsOut);
  // await handleTx(
  //   reward.sell(vaultAddr, toAddr, amount, minAssetsOut),
  //   "vaultReward.sell"
  // );
}

async function claimableReward(addr) {
  const reward = await readVaultRewardContract();
  return await reward.claimableReward(addr);
}

async function claimLPReward() {
  const reward = await readVaultRewardContract();
  // await handleTx(reward.claimLPReward(), "vaultReward.claimLPReward");
  return await reward.claimLPReward();
}

async function updateRewards() {
  const reward = await readVaultRewardContract();
  // await handleTx(reward.updateRewards(), "vaultReward.updateRewards");
  return await reward.updateRewards();
}

async function setAPR(apr) {
  const reward = await readVaultRewardContract();
  //await handleTx(reward.setAPR(apr), "vaultReward.setAPR");
  return await reward.setAPR(apr);
}

async function updateRewardsByAccount(owner) {
  const reward = await readVaultRewardContract();
  return await reward.updateRewardsByAccount(owner);
}

async function getLPReward() {
  const reward = await readVaultRewardContract();
  return await reward.getLPReward();
}

async function getLPPrice() {
  const reward = await readVaultRewardContract();
  return await reward.getLPPrice();
}

async function previewDeposit(assetAmount) {
  const reward = await readVaultRewardContract();
  return await reward.previewDeposit(assetAmount);
}

async function previewMint(assetAmount) {
  const reward = await readVaultRewardContract();
  return await reward.previewMint(assetAmount);
}

async function previewWithdraw(amount) {
  const reward = await readVaultRewardContract();
  return await reward.previewWithdraw(amount);
}

async function previewRedeem(shares) {
  const reward = await readVaultRewardContract();
  return await reward.previewRedeem(shares);
}

async function getUSDBalance() {
  const reward = await readVaultRewardContract();
  return await reward.getUSDBalance();
}

async function getAUM() {
  const reward = await readVaultRewardContract();
  return await reward.getAUM();
}

async function priceDecimals() {
  const reward = await readVaultRewardContract();
  return await reward.priceDecimals();
}

async function getSellLpFee(vault) {
  const reward = await readVaultRewardContract();
  return await reward.sellLpFee(vault);
}

async function getBuyLpFee(vault) {
  const reward = await readVaultRewardContract();
  return await reward.buyLpFee(vault);
}

async function getAPR() {
  const reward = await readVaultRewardContract();
  return await reward.getAPR();
}

async function tokensPerInterval() {
  const reward = await readVaultRewardContract();
  return await reward.tokensPerInterval();
}

async function rewardToken() {
  const reward = await readVaultRewardContract();
  return await reward.rewardToken();
}

async function pendingRewards() {
  const reward = await readVaultRewardContract();
  return await reward.pendingRewards();
}

async function claimable(account) {
  const reward = await readVaultRewardContract();
  return await reward.claimable(account);
}

module.exports = {
  deployVaultReward,
  readVaultRewardContract,
  initializeVaultReward,
  setAPR,
  buy,
  sell,
  claimLPReward,
  getFeeRouter,
  getCoreVault,
  getCumulativeRewardPerToken,
  getVaultRouter,
  getDistributor,
  claimableReward,
  updateRewards,
  getLPReward,
  getLPPrice,
  previewDeposit,
  previewMint,
  previewWithdraw,
  previewRedeem,
  getUSDBalance,
  getAUM,
  priceDecimals,
  getSellLpFee,
  getBuyLpFee,
  getAPR,
  tokensPerInterval,
  rewardToken,
  pendingRewards,
  claimable,
  initialize,
  updateRewardsByAccount,
};
