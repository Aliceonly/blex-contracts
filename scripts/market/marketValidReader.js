const {
  deployOrConnect,
  deployContract,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployMarketValidReader(marketValidAddr, writeJson = true) {
  const reader = await deployContract("MarketValidReader", [marketValidAddr]);

  const result = {
    MarketValidReader: reader.address,
  };
  if (writeJson) writeContractAddresses(result);

  return reader;
}

async function readMarketValidReaderContract() {
  const reader = await readDeployedContract("MarketValidReader");
  return reader;
}
async function readMarketValidReaderContractFromMarketID({ marketID }) {
  const reader = await readDeployedContract(
    "MarketValidReader",
    [],
    "MarketValidReader" + marketID
  );
  return reader;
}

async function getMinLevMarketVaildReader() {
  const reader = await readMarketValidReaderContract();
  return await reader.getMinLev();
}

async function minSlippageMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.minSlippage();
}
async function maxSlippageMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.maxSlippage();
}

async function getMaxLevMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.getMaxLev();
}
async function getMinPayMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.getMinPay();
}
async function getMinCollateralMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.getMinCollateral();
}
async function getMaxTradeAmountMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.getMaxTradeAmount();
}
async function getAllowOpenMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.getAllowOpen();
}

async function getAllowCloseMarketVaildReader() {
  const reader = await readMarketValidReaderContract();

  return await reader.getAllowClose();
}

module.exports = {
  deployMarketValidReader,
  readMarketValidReaderContract,
  getMinLevMarketVaildReader,
  getMaxLevMarketVaildReader,
  getAllowCloseMarketVaildReader,
  getAllowOpenMarketVaildReader,
  getMaxTradeAmountMarketVaildReader,
  getMinCollateralMarketVaildReader,
  getMinPayMarketVaildReader,
  minSlippageMarketVaildReader,
  maxSlippageMarketVaildReader,
  readMarketValidReaderContractFromMarketID,
};
