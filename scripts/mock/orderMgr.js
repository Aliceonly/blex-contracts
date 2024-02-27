const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
  deployContract,
} = require("../utils/helpers");

async function deployMockOrderMgr(writeJson = true) {
  const or = await deployOrConnect("MockOrderMgr", []);
  const result = {
    MockOrderMgr: or.address,
  };
  if (writeJson) writeContractAddresses(result);

  return or;
}

async function readMockOrderMgr() {
  const or = await readDeployedContract("MockOrderMgr");
  return or;
}

async function updateOrder(vars) {
  const or = await readDeployedContract("MockOrderMgr");
  return await or.updateOrder(vars);
}

async function cancelOrderList(
  account,
  isIncreaseList,
  orderIDList,
  isLongList
) {
  const or = await readDeployedContract("MockOrderMgr");
  return await or.cancelOrderList(
    account,
    isIncreaseList,
    orderIDList,
    isLongList
  );
}

async function sysCancelOrder(orderKey, isLong, isIncrease, reasons) {
  const or = await readDeployedContract("MockOrderMgr");
  return await handleTx(
    or.sysCancelOrder(orderKey, isLong, isIncrease, reasons),
    "MockOrderMgr.sysCancelOrder"
  );
}

async function setPositionBook(book) {
  const or = await readDeployedContract("MockOrderMgr");

  return await or.setPositionBook(book);
}

async function setIndexToken(indexToken) {
  const or = await readDeployedContract("MockOrderMgr");

  return await or.setIndexToken(indexToken);
}

async function setMarketValid(newMv) {
  const or = await readDeployedContract("MockOrderMgr");
  return await or.setMarketValid(newMv);
}

async function setVaultRouter(vr) {
  const or = await readDeployedContract("MockOrderMgr");

  return await or.setVaultRouter(vr);
}

async function setOraclePrice(pf) {
  const or = await readDeployedContract("MockOrderMgr");

  return await or.setOraclePrice(pf);
}

async function setCollateralToken(token) {
  const or = await readDeployedContract("MockOrderMgr");

  return await or.setCollateralToken(token);
}

async function setFeeRouter(fr) {
  const or = await readDeployedContract("MockOrderMgr");
  return await or.setFeeRouter(fr);
}

async function setOrderStore(isLong, isOpen, os) {
  const or = await readDeployedContract("MockOrderMgr");
  return await or.setOrderStore(isLong, isOpen, os);
}
async function setOrderBookLong(long) {
  const or = await readDeployedContract("MockOrderMgr");
  return await or.setorderBookLong(long);
}

async function setorderBookShort(short) {
  const or = await readDeployedContract("MockOrderMgr");
  return await or.setorderBookShort(short);
}

module.exports = {
  deployMockOrderMgr,
  readMockOrderMgr,
  updateOrder,
  cancelOrderList,
  sysCancelOrder,
  setorderBookShort,
  setOrderBookLong,
  setOrderStore,
  setFeeRouter,
  setCollateralToken,
  setOraclePrice,
  setVaultRouter,
  setIndexToken,
  setMarketValid,
  setPositionBook,
};
