const { expect } = require("chai");
const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  readDeployedContract2,
  deployContractAndReturnReceipt,
  getDeployer,
} = require("../utils/helpers");

async function deployMarket(factoryAddr, writeJson = true) {
  const { contract: market, receipt } = await deployContractAndReturnReceipt(
    "Market",
    [factoryAddr]
  );

  const result = {
    Market: market.address,
    ["Market_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return market;
}

async function deployMarketSymbol(factoryAddr, lable, writeJson = true) {
  const { contract: market, receipt } = await deployContractAndReturnReceipt(
    "Market",
    [factoryAddr],
    lable
  );

  const result = {
    [lable]: market.address,
    ["Market_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return market;
}
/**
 * @param {ETH or BTC} symbol
 * @returns market contract
 */ 
async function readMarketContract() {
  const market = await readDeployedContract("Market");
  return market;
}

async function readMarketContractFromMarketID({ marketID }) {
  const market = await readDeployedContract("Market", [], "Market" + marketID);
  return market;
}

async function getMarketContract() {
  let data = await fetchContractAddresses();

  let marketAddr;
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    if (element.name == "Market") {
      marketAddr = element.address;
    }
  }
  const contractFactory = await ethers.getContractFactory("Market");
  const market = await contractFactory.attach(marketAddr);
  return market;
}

async function readMarketContractFromAPI() {
  let data = await fetchContractAddresses();

  let marketAddr;
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    if (element.name == "Market") {
      marketAddr = element.address;
    }
  }
  const contractFactory = await ethers.getContractFactory("Market");
  const market = await contractFactory.attach(marketAddr);
  return market;
}

async function initialize(name, initAddrs) {
  const market = await readMarketContract();
  await handleTx(market.initialize(initAddrs, name), "market.initialize");
}

async function addPlugin(pluginAddr) {
  const market = await readMarketContract();
  await handleTx(market.addPlugin(pluginAddr), "market.addPlugin");
}

async function setOrderBooks(orderBookLongAddr, orderBookShortAddr) {
  const market = await readMarketContract();

  await handleTx(
    market.setOrderBooks(orderBookLongAddr, orderBookShortAddr),
    "market.setOrderBooks"
  );
}

async function setPositionBook(positionBookAddr) {
  const market = await readMarketContract();
  await handleTx(
    market.setPositionBook(positionBookAddr),
    "market.setPositionBook"
  );
}

async function setMarketValid(marketValidAddr) {
  const market = await readMarketContract();
  return await market.setMarketValid(marketValidAddr);
}

async function setPositionMgr(mgrAddr, isAdd) {
  const market = await readMarketContract();
  await handleTx(
    market.setPositionMgr(mgrAddr, isAdd),
    "market.setPositionMgr"
  );
}

async function setOrderMgr(mgrAddr) {
  const market = await readMarketContract();
  await handleTx(market.setOrderMgr(mgrAddr), "market.setOrderMgr");
}
async function increasePositionWithOrders(input) {
  const market = await readMarketContract();
  return await market.increasePositionWithOrders(input);
}

async function decreasePosition(vars) {
  const market = await readMarketContract();
  return await market.decreasePosition(vars);
}

async function liquidatePositionsRevertWithReason(accounts, isLong, reason) {
  const market = await readMarketContract();
  return await expect(
    market.liquidatePositions(accounts, isLong)
  ).be.to.rejectedWith(reason);
}

async function liquidatePositions(accounts, isLong) {
  const market = await readMarketContract();
  return await market.liquidatePositions(accounts, isLong);
}

async function execOrderKey(exeOrder, params) {
  const market = await readMarketContract();
  console.log("market  sss333444", market.address);

  return await market.execOrderKey(exeOrder, params);
}

async function updateCumulativeFundingRate() {
  const market = await readMarketContract();
  return await market.updateCumulativeFundingRate();
}

async function getPNL() {
  const market = await readMarketContract();
  console.log("market sss333444", market.address);

  return await market.getPNL();
}

async function setPriceFeed(a) {
  const market = await readMarketContract();
  return await market.setPriceFeed(a);
}

async function getPositions(account) {
  const market = await readMarketContract();
  return await market.getPositions(account);
}

async function USDDecimals() {
  const market = await readMarketContract();

  return await market.USDDecimals();
}

async function sysCancelOrder(orderKeys, isLongList, isIncreaseList, reasons) {
  const router = await readMarketContract();
  return router.sysCancelOrder(orderKeys, isLongList, isIncreaseList, reasons);
}

async function setContracts(contracts, symbol) {
  const market = await readMarketContract(symbol);
  const contractFactory = await ethers.getContractFactory("OrderMgr");
  const mgr = await contractFactory.attach(market.address);

  const newAddresses = [];
  for (let index = 0; index < contracts.length; index++) {
    const element = contracts[index];
    newAddresses.push(element.address);
  }
  await handleTx(mgr.setContracts(newAddresses), "mgr.setContracts");
}

module.exports = {
  deployMarket,
  readMarketContract,
  initialize,
  addPlugin,
  setOrderBooks,
  setPositionBook,
  setMarketValid,
  setPositionMgr,
  setOrderMgr,
  setContracts,
  readMarketContractFromAPI,
  USDDecimals,
  getPositions,
  setPriceFeed,
  getPNL,
  updateCumulativeFundingRate,
  execOrderKey,
  liquidatePositions,
  decreasePosition,
  increasePositionWithOrders,
  deployMarketSymbol,
  //initializeSymbol,
  liquidatePositionsRevertWithReason,
  readMarketContractFromMarketID,
};
