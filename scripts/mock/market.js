const {
  deployContract,
  readDeployedContract,
  handleTx,
  grantRoleIfNotGranted,
  writeContractAddresses,
  deployOrConnect,
} = require("../utils/helpers");

async function deployMarket(writeJson) {
  const market = await deployOrConnect("MockMarket", []);

  const result = {
    positionValid: market.address,
  };
  if (writeJson) writeContractAddresses(result);

  return market;
}

async function readMarketContract() {
  const market = await readDeployedContract("MockMarket");
  return market;
}

async function setPositionBook(positionBookAddr) {
  const market = await readDeployedContract("MockMarket");
  return await market.setPositionBook(positionBookAddr);
}

async function setMarketValid(newMv) {
  const market = await readDeployedContract("MockMarket");

  return await market.setMarketValid(newMv);
}

async function setVaultRouter(vr) {
  const market = await readDeployedContract("MockMarket");

  return await market.setVaultRouter(vr);
}

async function setOraclePrice(pf) {
  const market = await readDeployedContract("MockMarket");
  return await market.setOraclePrice(pf);
}

async function setCollateralToken(token) {
  const market = await readDeployedContract("MockMarket");
  return await market.setCollateralToken(token);
}

async function setMarketRouterMockMarket(mr) {
  const market = await readDeployedContract("MockMarket");

  return market.setMarketRouter(mr);
}

async function borrowFromVaultMockMarket(vr, amount) {
  const market = await readDeployedContract("MockMarket");
  return await market.borrowFromVault(vr, amount);
}

async function transferToVaultMockMarket(vr, account, amount) {
  const market = await readDeployedContract("MockMarket");

  return await market.transferToVault(vr, account, amount);
}

async function repayToVaultMockMarket(vr, amount) {
  const market = await readDeployedContract("MockMarket");

  return await market.repayToVault(vr, amount);
}

async function connectDeposit(user, usdc, coreVault, assets, receiver) {
  const market = await readDeployedContract("MockMarket");

  return await market.connect(user).deposit(usdc, coreVault, assets, receiver);
}

module.exports = {
  deployMarket,
  readMarketContract,
  setPositionBook,
  setMarketValid,
  setVaultRouter,
  setOraclePrice,
  setCollateralToken,
  borrowFromVaultMockMarket,
  transferToVaultMockMarket,
  repayToVaultMockMarket,
  setMarketRouterMockMarket,
  connectDeposit,
};
