const { expect } = require("chai");
const {
  deployOrConnect,
  deployContract,
  readDeployedContract,
  handleTx,
  readContractAddresses,
  writeContractAddresses,
  getContractAt,
  deployUpgradeable,
  waitTx,
} = require("../utils/helpers");

async function deployMarketRouter({
  deploy = deployContract,
  marketFactory,
  writeJson = true,
} = {}) {
  const { implementation, proxy, receipt } = await deployUpgradeable(
    "MarketRouter",
    "MarketRouter"
  );
  const result = {
    MarketRouter: proxy.address,
    ["MarketRouterImpl"]: implementation.address,
    ["MarketRouter_block"]: receipt.blockNumber,
  };
  const newContract = await getContractAt("MarketRouter", proxy.address);
  if (writeJson) writeContractAddresses(result);
  return newContract;
}

async function readMarketRouterContract() {
  let existingObj = readContractAddresses();
  const newContract = await getContractAt(
    "MarketRouter",
    existingObj["MarketRouter"]
  );
  return newContract;
}

async function setIsEnableMarketConvertToOrder(_enable) {
  const contract = await readMarketRouterContract();
  await handleTx(
    contract.setIsEnableMarketConvertToOrder(_enable),
    "setIsEnableMarketConvertToOrder"
  );
}

async function initializeRouter(factoryAddr, globalValidAddr, vaultRouterAddr) {
  const router = await readMarketRouterContract();
  await handleTx(
    router.initialize(factoryAddr, globalValidAddr, vaultRouterAddr),
    "router.initialize"
  );
}

async function addMarket(marketAddr, vaultAddr) {
  const router = await readMarketRouterContract();
  await handleTx(router.addMarket(marketAddr, vaultAddr), "router.addMarket");
}

async function removeMarket(marketAddr) {
  const router = await readMarketRouterContract();
  await handleTx(router.removeMarket(marketAddr), "router.removeMarket");
}

async function validateIncreasePosition(input) {
  const router = await readMarketRouterContract();
  return await router.validateIncreasePosition(input);
}

async function connectIncreasePosition(user, input) {
  const router = await readMarketRouterContract();
  return await waitTx(
    router.connect(user).increasePosition(input),
    "marketRouter connectIncreasePosition"
  );
}

async function connectIncreasePositionRevert(user, input) {
  const router = await readMarketRouterContract();
  await expect(router.connect(user).increasePosition(input)).to.be.reverted;
}

async function increasePosition(input) {
  const router = await readMarketRouterContract();
  return await waitTx(
    router.increasePosition(input),
    "marketRouter increasePosition"
  );
}
async function connectIncreasePositionRevertWithReason(user, params, reason) {
  const router = await readMarketRouterContract();
  return await expect(
    router.connect(user).increasePosition(params)
  ).to.be.rejectedWith(reason);
}

async function connectDecreasePositionRevertWithReason(user, params, reason) {
  const router = await readMarketRouterContract();
  return await expect(
    router.connect(user).decreasePosition(params)
  ).to.be.rejectedWith(reason);
}

async function increasePositionHandleTx(input) {
  const router = await readMarketRouterContract();
  return await handleTx(
    router.increasePosition(input),
    "marketRouter increasePosition"
  );
}

async function connectUpdateOrder(user, vars) {
  const router = await readMarketRouterContract();
  return await waitTx(
    router.connect(user).updateOrder(vars),
    "marketRouter  connectUpdateOrder"
  );
}

async function connectUpdateOrderRevert(user, vars) {
  const router = await readMarketRouterContract();

  await expect(router.connect(user).updateOrder(vars)).to.be.reverted;
}
async function connectUpdateOrderHandleTx(user, vars) {
  const router = await readMarketRouterContract();

  await handleTx(
    router.connect(user).updateOrder(vars),
    "marketRouter updateOrder"
  );
}

async function updateOrder(vars) {
  const router = await readMarketRouterContract();
  return await waitTx(router.updateOrder(vars), "marketRouter updateOrder");
}

async function decreasePosition(vars) {
  const router = await readMarketRouterContract();
  return await waitTx(
    router.decreasePosition(vars),
    "marketRouter decreasePosition"
  );
}

async function connectDecreasePositionHandleTx(user, vars) {
  const router = await readMarketRouterContract();
  return await handleTx(
    router.connect(user).decreasePosition(vars),
    "decreasePositionHandleTx"
  );
}
async function connectDecreasePosition(user, vars) {
  const router = await readMarketRouterContract();
  return await waitTx(
    router.connect(user).decreasePosition(vars),
    "marketRouter connectDecreasePosition"
  );
}

async function cancelOrderList(
  markets,
  isIncreaseList,
  orderIDList,
  isLongList
) {
  const router = await readMarketRouterContract();
  return await waitTx(
    router.cancelOrderList(markets, isIncreaseList, orderIDList, isLongList),
    "marketRouter cancelOrderList"
  );
}

async function connectCancelOrderList(
  user,
  markets,
  isIncreaseList,
  orderIDList,
  isLongList
) {
  const router = await readMarketRouterContract();
  return await waitTx(
    router
      .connect(user)
      .cancelOrderList(markets, isIncreaseList, orderIDList, isLongList),
    "marketRouter connectCancelOrderList "
  );
}

async function getGlobalPNL() {
  const router = await readMarketRouterContract();
  return await router.getGlobalPNL();
}

async function getGlobalSize() {
  const router = await readMarketRouterContract();

  return await router.getGlobalSize();
}

async function getAccountSize(account) {
  const router = await readMarketRouterContract();

  return await router.getAccountSize(account);
}

async function updatePositionBook(newA) {
  const router = await readMarketRouterContract();

  return await router.updatePositionBook(newA);
}

async function updatePositionCallback(event) {
  const router = await readMarketRouterContract();

  return await router.updatePositionCallback(event);
}

async function updateOrderCallback(event) {
  const router = await readMarketRouterContract();

  return await router.updateOrderCallback(event);
}

async function deleteOrderCallback(event) {
  const router = await readMarketRouterContract();
  return await router.deleteOrderCallback(event);
}

async function getMarkets() {
  const router = await readMarketRouterContract();
  return await router.getMarkets();
}

module.exports = {
  deployMarketRouter,
  setIsEnableMarketConvertToOrder,
  readMarketRouterContract,
  initializeRouter,
  addMarket,
  removeMarket,
  validateIncreasePosition,
  increasePosition,
  updatePositionBook,
  updateOrder,
  decreasePosition,
  cancelOrderList,
  getAccountSize,
  getGlobalSize,
  getGlobalPNL,
  updatePositionCallback,
  updateOrderCallback,
  deleteOrderCallback,
  connectIncreasePosition,
  connectUpdateOrder,
  connectDecreasePosition,
  connectCancelOrderList,
  connectUpdateOrderRevert,
  connectIncreasePositionRevert,
  increasePositionHandleTx,
  connectIncreasePositionRevertWithReason,
  connectDecreasePositionRevertWithReason,
  connectDecreasePositionHandleTx,
  getMarkets,
  connectUpdateOrderHandleTx,
};
