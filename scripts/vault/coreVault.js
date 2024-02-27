const {
  getContractAt,
  readUpgradableDeployedContract,
  handleTx,
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  deployUpgradeable,
} = require("../utils/helpers");

async function deployCoreVault(writeJson = true) {
  // const vault = await deployOrConnect("CoreVault", [asset, name, symbol]);
  const { implementation, proxy, receipt } = await deployUpgradeable(
    "CoreVault",
    "CoreVault"
  );
  const result = {
    CoreVault: proxy.address,
    ["CoreVaultImpl"]: implementation.address,
    ["CoreVault_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return getContractAt("CoreVault", proxy.address);
}

// async function deployCoreVaultSymbol(symbol, writeJson = true) {
//   const { implementation, proxy, receipt } = await deployUpgradeable(
//     "CoreVault",
//     symbol
//   );
//   const result = {
//     [symbol]: proxy.address,
//     ["CoreVaultImpl"]: implementation.address,
//     ["CoreVault_block"]: receipt.blockNumber,
//   };
//   if (writeJson) writeContractAddresses(result);

//   return getContractAt("CoreVault", proxy.address);
// }

async function readCoreVaultContract() {
  const vault = await readUpgradableDeployedContract("CoreVault");
  return vault;
}

async function initCoreVault({
  coreVault,
  asset,
  name,
  symbol,
  vaultRouterAddr,
  feeRouterAddr,
  vaultRewardAddr,
}) {
  if (null == coreVault) coreVault = await readCoreVaultContract();
  await handleTx(
    coreVault.initialize(
      asset,
      name,
      symbol,
      vaultRouterAddr,
      feeRouterAddr,
      vaultRewardAddr
    ),
    "coreVault.initialize"
  );
}

async function initialize(vaultRouterAddr) {
  const vault = await readCoreVaultContract();
  // await handleTx(vault.initialize(vaultRouterAddr), "coreVault.initialize");
  return await vault.initialize(vaultRouterAddr);
}

async function setVaultRouter(vaultRouterAddr) {
  const vault = await readCoreVaultContract();
  // await handleTx(
  //   vault.setVaultRouter(vaultRouterAddr),
  //   "coreVault.setVaultRouter"
  // );
  return await vault.setVaultRouter(vaultRouterAddr);
}

async function getVaultRouter() {
  const vault = await readCoreVaultContract();
  // await handleTx(
  //   vault.setVaultRouter(vaultRouterAddr),
  //   "coreVault.setVaultRouter"
  // );
  return await vault.vaultRouter();
}

async function setLpFee(isBuy, fee) {
  const vault = await readCoreVaultContract();
  // await handleTx(vault.setLpFee(isBuy, fee), "coreVault.setLpFee");
  return await vault.setLpFee(isBuy, fee);
}

async function setCooldownDuration(duration) {
  const vault = await readCoreVaultContract();
  // await handleTx(
  //   vault.setCooldownDuration(duration),
  //   "coreVault.setCooldownDuration"
  // );

  return await vault.setCooldownDuration(duration);
}

async function getCooldownDuration() {
  const vault = await readCoreVaultContract();
  return await vault.cooldownDuration();
}

async function setIsFreeze(isFreeze) {
  const vault = await readCoreVaultContract();
  // await handleTx(vault.setIsFreeze(isFreeze), "coreVault.setIsFreeze");
  return await vault.setIsFreeze(isFreeze);
}

// isFreeze//
async function getIsFreeze() {
  const vault = await readCoreVaultContract();
  // await handleTx(vault.setIsFreeze(isFreeze), "coreVault.setIsFreeze");
  return await vault.isFreeze();
}

async function transferOutAssets(toAddress, amount) {
  const vault = await readCoreVaultContract();
  // await handleTx(
  //   vault.transferOutAssets(toAddress, amount),
  //   "coreVault.transferOutAssets"
  // );

  return await vault.transferOutAssets(toAddress, amount);
}

async function computationalCosts(isBuy, amount) {
  const vault = await readCoreVaultContract();
  const cost = await vault.computationalCosts(isBuy, amount);
  return cost;
}

async function verifyOutAssets(toAddress, amount) {
  const vault = await readCoreVaultContract();
  const isOk = await vault.verifyOutAssets(toAddress, amount);
  return isOk;
}

async function getLPFee(isBuy) {
  const vault = await readCoreVaultContract();
  const fee = await vault.getLPFee(isBuy);
  return fee;
}

//ERC4626

async function decimals() {
  const vault = await readCoreVaultContract();

  return await vault.decimals();
}

async function getTotalAssets() {
  const vault = await readCoreVaultContract();
  const amount = await vault.totalAssets();
  return amount;
}

async function getAsset() {
  const vault = await readCoreVaultContract();
  return await vault.asset();
}
async function convertToShares(assets) {
  const vault = await readCoreVaultContract();
  return await vault.convertToShares(assets);
}

async function convertToAssets(shares) {
  const vault = await readCoreVaultContract();
  return await vault.convertToAssets(shares);
}

async function maxDeposit(addr) {
  const vault = await readCoreVaultContract();
  return vault.maxDeposit(addr);
}

async function maxMint(addr) {
  const vault = await readCoreVaultContract();
  return vault.maxMint(addr);
}

async function maxWithdraw(owner) {
  const vault = await readCoreVaultContract();
  return vault.maxWithdraw(owner);
}
async function maxRedeem(owner) {
  const vault = await readCoreVaultContract();
  return vault.maxRedeem(owner);
}

async function previewDeposit(assets) {
  const vault = await readCoreVaultContract();

  return await vault.previewDeposit(assets);
}

async function previewMint(shares) {
  const vault = await readCoreVaultContract();

  return await vault.previewMint(shares);
}

async function previewWithdraw(assets) {
  const vault = await readCoreVaultContract();

  return await vault.previewWithdraw(assets);
}

async function previewRedeem(shares) {
  const vault = await readCoreVaultContract();
  return vault.previewRedeem(shares);
}

async function connectDeposit(user, assets, receiver) {
  const vault = await readCoreVaultContract();
  return await vault.connect(user).deposit(assets, receiver);
}

async function deposit(assets, receiver) {
  const vault = await readCoreVaultContract();
  return await vault.deposit(assets, receiver);
}

async function mint(shares, receiver) {
  const vault = await readCoreVaultContract();

  return await vault.mint(shares, receiver);
}

async function withdraw(assets, receiver, owner) {
  const vault = await readCoreVaultContract();

  return await vault.withdraw(assets, receiver, owner);
}

async function redeem(shares, receiver, owner) {
  const vault = await readCoreVaultContract();

  return vault.redeem(shares, receiver, owner);
}

async function balanceOfCoreVault(owner) {
  const vault = await readCoreVaultContract();
  return vault.balanceOf(owner);
}

async function totalSupply() {
  const vault = await readCoreVaultContract();
  return await vault.totalSupply();
}

module.exports = {
  deployCoreVault,
  readCoreVaultContract,
  initCoreVault,
  setVaultRouter,
  getVaultRouter,
  setLpFee,
  setCooldownDuration,
  getCooldownDuration,
  setIsFreeze,
  getIsFreeze,
  transferOutAssets,
  balanceOfCoreVault,
  computationalCosts,
  verifyOutAssets,
  getTotalAssets,
  getLPFee,
  getAsset,
  redeem,
  withdraw,
  mint,
  deposit,
  decimals,
  convertToAssets,
  convertToShares,
  maxDeposit,
  maxMint,
  maxWithdraw,
  maxRedeem,
  previewDeposit,
  previewMint,
  previewWithdraw,
  previewRedeem,
  connectDeposit,
  totalSupply,
};
