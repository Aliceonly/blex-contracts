const { parseTransaction } = require("ethers/lib/utils");
const {
  deployContract,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  deployOrConnect,
} = require("../utils/helpers");

async function deployOrderRouter(factoryAddr, writeJson = true) {
  const orderRouter = await deployOrConnect("OrderRouter", [factoryAddr]);
  const result = {
    OrderRouter: orderRouter.address,
  };
  if (writeJson) writeContractAddresses(result);
  return orderRouter;
}

async function readOrderRouterContract() {
  const orderRouter = await readDeployedContract("OrderRouter");
  return orderRouter;
}

async function initializeOrderRouter(oracleAddr) {
  const orderRouter = await readOrderRouterContract();
  await handleTx(orderRouter.initialize(oracleAddr), "orderRouter.initialize");
}

async function orderRouterAddMarkets(marketAddrs) {
  const orderRouter = await readOrderRouterContract();
  await handleTx(orderRouter.addMarkets(marketAddrs), "orderRouter.addMarkets");
}

async function setPricesAndExecute(token, price, timestamp, orders) {
  const orderRouter = await readOrderRouterContract();

  return await orderRouter.setPricesAndExecute(token, price, timestamp, orders);
}
async function orderRouterTokenToMarkets(token) {
  const orderRouter = await readOrderRouterContract();
  return await orderRouter.tokenToMarkets(token);
}
module.exports = {
  deployOrderRouter,
  readOrderRouterContract,
  initializeOrderRouter,
  orderRouterAddMarkets,
  setPricesAndExecute,
  orderRouterTokenToMarkets,
};
