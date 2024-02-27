const {
  deployContract,
  readDeployedContract2,
  handleTx,
  writeContractAddresses,
  deployContractAndReturnReceipt,
  waitTx,
} = require("../utils/helpers");

async function deployOrderBook(factoryAddr, writeJson, isLong, symbol) {
  const key = "OrderBook" + (isLong ? "Long" : "Short");
  const { contract: orderBook, receipt } = await deployContractAndReturnReceipt(
    "OrderBook",
    [factoryAddr],
    key
  );

  const result = {
    [key]: orderBook.address,
    [key + "_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return orderBook;
}

async function readOrderBookContract({ isLong, symbol } = {}) {
  const key = "OrderBook" + (isLong ? "Long" : "Short");
  const orderBook = await readDeployedContract2({
    name: "OrderBook",
    label: key,
  });
  return orderBook;
}
async function readOrderBookContractFromMarketID({ marketID, isLong } = {}) {
  const key = "OrderBook" + (isLong ? "Long" : "Short") + marketID;
  const orderBook = await readDeployedContract2({
    name: "OrderBook",
    label: key,
  });
  return orderBook;
}

async function initializeOrderBook({
  openStoreAddr,
  closeStoreAddr,
  isLong,
  symbol,
} = {}) {
  const orderBook = await readOrderBookContract({
    isLong: isLong,
    symbol: symbol,
  });
  await handleTx(
    orderBook.initialize(isLong, openStoreAddr, closeStoreAddr),
    "orderBook.initialize"
  );
}

async function getOpenStore(label) {
  const orderBook = await readOrderBookContract(label);
  return await orderBook.openStore();
}
async function getCloseStore(label) {
  const orderBook = await readOrderBookContract(label);
  return await orderBook.closeStore();
}

async function getExecutableOrdersByPrice(
  start,
  end,
  isOpen,
  oraclePrice,
  isLong
) {
  const orderBook = await readOrderBookContract({
    isLong: isLong,
  });
  //const orderBook  = await readOrderBookContract(label);
  return await orderBook.getExecutableOrdersByPrice(
    start,
    end,
    isOpen,
    oraclePrice
  );
}

async function add(vars, isLong) {
  const orderBook = await readOrderBookContract({ isLong: isLong });
  return await orderBook.add(vars);
}

async function update(vars, isLong) {
  const orderBook = await readOrderBookContract({ isLong });
  return await orderBook.update(vars);
}
async function removeByAccount(isOpen, account, isLong) {
  const orderBook = await readOrderBookContract({ isLong });
  return await orderBook.removeByAccount(isOpen, account);
}

async function remove(account, orderID, isOpen, label) {
  const orderBook = await readOrderBookContract(label);
  return await orderBook.remove(account, orderID, isOpen);
}
async function removeByKey(key, isOpen, label) {
  const orderBook = await readOrderBookContract(label);
  return await orderBook.remove(key, isOpen);
}

module.exports = {
  deployOrderBook,
  readOrderBookContract,
  initializeOrderBook,
  getExecutableOrdersByPrice,
  removeByKey,
  remove,
  removeByAccount,
  update,
  add,
  getOpenStore,
  getCloseStore,
  readOrderBookContractFromMarketID,
};
