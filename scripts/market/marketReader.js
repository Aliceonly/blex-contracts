const {
  deployContract,
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployMarketReader(factoryAddr, writeJson = true) {
  const reader = await deployOrConnect("MarketReader", [factoryAddr]);

  const result = {
    MarketReader: reader.address,
  };
  if (writeJson) writeContractAddresses(result);

  return reader;
}

async function readMarketReaderContract() {
  const reader = await readDeployedContract("MarketReader");
  return reader;
}

async function initializeReader(marketRouterAddr, vaultRouterAddr) {
  const reader = await readMarketReaderContract();
  await handleTx(
    reader.initialize(marketRouterAddr, vaultRouterAddr),
    "reader.initialize"
  );
}

async function getMarketsReader() {
  const reader = await readMarketReaderContract();
  return await reader.getMarkets();
}

async function isLiquidateReader(market, account, isLong) {
  const reader = await readMarketReaderContract();

  return await reader.isLiquidate(market, account, isLong);
}

async function getFundingRateReader(market, isLong) {
  const reader = await readMarketReaderContract();

  return await reader.getFundingRate(market, isLong);
}

async function availableLiquidityReader(market, account, isLong) {
  const reader = await readMarketReaderContract();
  return await reader.availableLiquidity(market, account, isLong);
}

async function getMarketReader(marketAddr) {
  const reader = await readMarketReaderContract();
  return await reader.getMarket(marketAddr);
}

async function getPositionsReader(account, market) {
  const reader = await readMarketReaderContract();
  return reader.getPositions(account, market);
}

async function getFundingFeeReader(account, market, isLong) {
  const reader = await readMarketReaderContract();
  return await reader.getFundingFee(account, market, isLong);
}
// async function

module.exports = {
  deployMarketReader,
  readMarketReaderContract,
  initializeReader,
  getFundingFeeReader,
  getPositionsReader,
  getMarketReader,
  availableLiquidityReader,
  getFundingRateReader,
  isLiquidateReader,
  getMarketsReader,
};
