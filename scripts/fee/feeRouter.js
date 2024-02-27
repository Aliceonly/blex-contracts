const {
  deployContractAndReturnReceipt,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  deployOrConnect,
} = require("../utils/helpers");

async function deployFeeRouter(factoryAddr, writeJson) {
  const { contract: router, receipt } = await deployContractAndReturnReceipt(
    "FeeRouter",
    [factoryAddr]
  );

  const result = {
    FeeRouter: router.address,
    ["FeeRouter_block"]: receipt.blockNumber,
  };
  if (writeJson) {
    writeContractAddresses(result);
  }
  return router;
}

async function readFeeRouterContract() {
  const router = await readDeployedContract("FeeRouter");
  return router;
}

async function initFeeRouter(feeVaultAddr, fundFeeAddr) {
  const router = await readDeployedContract("FeeRouter");
  return await router.initialize(feeVaultAddr, fundFeeAddr);
}

async function setFeeAndRates(market, rates) {
  const router = await readDeployedContract("FeeRouter");
  await handleTx(
    router.setFeeAndRates(market, rates),
    "feeRouter.setFeeAndRates"
  );
}

async function updateCumulativeFundingRate(marketAddr, longSize, shortSize) {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.updateCumulativeFundingRate(
    marketAddr,
    longSize,
    shortSize
  );
}

async function getFeeAndRates(marketAddr, kind) {
  const feeRouter = await readFeeRouterContract();
  const feeRate = feeRouter.feeAndRates(marketAddr, kind);
  return feeRate;
}

async function getGlobalFees() {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.getGlobalFees();
}

async function withdraw(token, to, amount) {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.withdraw(token, to, amount);
}

async function collectFees(account, token, fees) {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.collectFees(account, token, fees);
}

async function getCumulativeFundingRates(market, isLong) {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.cumulativeFundingRates(market, isLong);
}

async function getFundingRate(market, isLong) {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.getFundingRate(market, isLong);
}

async function getFees(params, position) {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.getFees(params, position);
}

async function getOrderFees(params) {
  const feeRouter = await readFeeRouterContract();
  return await feeRouter.getOrderFees(params);
}

async function getExecFee(market) {
  const feeRouter = await readFeeRouterContract();

  return await feeRouter.getExecFee(market);
}

module.exports = {
  deployFeeRouter,
  readFeeRouterContract,
  initFeeRouter,
  setFeeAndRates,
  getFeeAndRates,
  updateCumulativeFundingRate,
  collectFees,
  getFees,
  getCumulativeFundingRates,
  getGlobalFees,
  getOrderFees,
  getFundingRate,
  getExecFee,
  withdraw,
};
