const {
  deployContract,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  readDeployedContract2,
  deployContractAndReturnReceipt,
  fetchContractAddresses,
  getMarketIdBySymbol,
  waitTx,
} = require("../utils/helpers");

async function deployOrderStore(factoryAddr, writeJson = true, label) {
  // if (isLong && isOpen) label = "0";
  // if (isLong && !isOpen) label = "1";
  // if (!isLong && isOpen) label = "2";
  // if (!isLong && !isOpen) label = "3";
  const key = "OrderStore" + label;

  const { contract: orderStore, receipt } =
    await deployContractAndReturnReceipt("OrderStore", [factoryAddr], key);

  const result = {
    [key]: orderStore.address,
    [key + "_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return orderStore;
}

// async function readOrderStoreContract({ symbol, isLong, isOpen } = {}) {
// 	if (isLong && isOpen) label = "0"
// 	if (isLong && !isOpen) label = "1"
// 	if (!isLong && isOpen) label = "2"
// 	if (!isLong && !isOpen) label = "3"
// 	const key = "OrderStore" + (label);
// 	const orderStore = await readDeployedContract2({ name:"OrderStore", label: key,symbol: symbol });
// 	if (writeJson)
// 		writeContractAddresses(result)
// 	return orderStore;
// }

async function readOrderStoreContract(label) {
  const key = "OrderStore" + label;
  const orderStore = await readDeployedContract("OrderStore", [], key);
  return orderStore;
}

async function readOrderStoreContractFromMarketID({ marketID, label }) {
  const key = "OrderStore" + label + marketID;
  const orderStore = await readDeployedContract("OrderStore", [], key);
  return orderStore;
}

async function readOrderStoreContractFromAPI({ symbol, isLong, isOpen } = {}) {
  if (isLong && isOpen) label = "0";
  if (isLong && !isOpen) label = "1";
  if (!isLong && isOpen) label = "2";
  if (!isLong && !isOpen) label = "3";
  const key = "OrderStore" + label;
  const datas = await fetchContractAddresses();
  for (let index = 0; index < datas.length; index++) {
    const element = datas[index];
    const marketid = getMarketIdBySymbol(symbol);
    console.log(marketid);
    if (element.name == key && String(marketid) == String(element.marketID)) {
      const contractFactory = await ethers.getContractFactory("OrderStore");
      return await contractFactory.attach(element.address);
    }
  }
}

async function initialize(isLong, label) {
  const orderStore = await readOrderStoreContract(label);
  await handleTx(orderStore.initialize(isLong), "orderStore.initialize");
}

async function isLong(label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.isLong();
}

async function getKey(index, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.getKey(index);
}
//orderNum
async function getAccountOrderNumber(account, label) {
  const orderStore = await readOrderStoreContract(label);
  return orderStore.orderNum(account);
}

async function addOrderStore(order, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.add(order);
}

async function ordersIndex(account, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.ordersIndex(account);
}

async function setOrderStore(order, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.set(order);
}

async function removeOrderStore(key, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.remove(key);
}

async function delByAccount(account, label) {
  const orderStore = await readOrderStoreContract(label);
  return await waitTx(
    orderStore.delByAccount(account),
    "orderStore delByAccount"
  );
}

async function getOrderByAccount(account, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.getOrderByAccount(account);
}

async function getByIndex(index, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.getByIndex(index);
}
async function containsKey(key, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.containsKey(key);
}

async function getCount(label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.getCount();
}

async function getKeys(start, end, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.getKeys(start, end);
}

async function generateID(account, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.generateID(account);
}
async function getOrderByKey(key, label) {
  const orderStore = await readOrderStoreContract(label);
  return await orderStore.orders(key);
}

module.exports = {
  deployOrderStore,
  readOrderStoreContract,
  initialize,
  readOrderStoreContractFromAPI,
  getOrderByAccount,
  ordersIndex,
  getAccountOrderNumber,
  getOrderByKey,
  generateID,
  getKeys,
  getCount,
  containsKey,
  getByIndex,
  addOrderStore,
  setOrderStore,
  removeOrderStore,
  delByAccount,
  getKey,
  isLong,
  readOrderStoreContractFromMarketID,
};
