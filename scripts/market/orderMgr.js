const {
  deployContract,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  deployOrConnect,
} = require("../utils/helpers");
const { readMarketContract } = require("./market");

async function deployOrderMgr(writeJson = true) {
  const mgr = await deployOrConnect("OrderMgr", []);
  const result = {
    OrderMgr: mgr.address,
  };
  if (writeJson) writeContractAddresses(result);
  return mgr;
}

async function readOrderMgrContract() {
  const mgr = await readDeployedContract("OrderMgr");
  return mgr;
}

async function updateOrder(vars) {
  const mgr = await readDeployedContract("OrderMgr");
  return await mgr.updateOrder(vars);
}

async function getPrice(isMax) {
  const mgr = await readDeployedContract("OrderMgr");
  return await mgr.getPrice(isMax);
}

async function cancelOrderList(
  account,
  isIncreaseList,
  orderIDList,
  isLongList
) {
  const mgr = await readDeployedContract("OrderMgr");
  return await mgr.cancelOrderList(
    account,
    isIncreaseList,
    orderIDList,
    isLongList
  );
}

async function sysCancelOrder(orderKey, isLong, isIncrease) {
  const mgr = await readDeployedContract("OrderMgr");

  return await mgr.sysCancelOrder(orderKey, isLong, isIncrease);
}

module.exports = {
  deployOrderMgr,
  readOrderMgrContract,
  sysCancelOrder,
  cancelOrderList,
  getPrice,
  updateOrder,
};
