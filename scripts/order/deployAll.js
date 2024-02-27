const { deployMarketFactory } = require("../market/marketFactory.js");
const { grantRoleIfNotGranted } = require("../utils/helpers.js");
const {
  deployOrderBook: deployOB,
  readOrderBookContract: readOB,
  initializeOrderBook,
  readOrderBookContractFromMarketID,
} = require("./orderBook.js");
const {
  deployOrderStore,
  initialize: initializeOrderStore,
  readOrderStoreContract,
  readOrderStoreContractFromMarketID,
} = require("./orderStore.js");

async function deployOrderBook(factoryAddr, isLong, writeJson = true) {
  let orderStoreKey1 = "0";
  let orderStoreKey2 = "1";
  let orderBookKey = "Long";

  if (!isLong) {
    orderStoreKey1 = "2";
    orderStoreKey2 = "3";
    orderBookKey = "Short";
  }

  const orderStoreOpen = await deployOrderStore(
    factoryAddr,
    writeJson,
    orderStoreKey1
  );
  const orderStoreClose = await deployOrderStore(
    factoryAddr,
    writeJson,
    orderStoreKey2
  );

  const orderBook = await deployOB(factoryAddr, writeJson, isLong);
  await initializeOrderBook({
    openStoreAddr: orderStoreOpen.address,
    closeStoreAddr: orderStoreClose.address,
    isLong: isLong,
    symbol: orderBookKey,
  });
  grantRoleIfNotGranted(orderStoreOpen, "ROLE_CONTROLLER", orderBook.address);
  grantRoleIfNotGranted(orderStoreClose, "ROLE_CONTROLLER", orderBook.address);

  return {
    orderBook: orderBook,
    orderStoreOpen: orderStoreOpen,
    orderStoreClose: orderStoreClose,
  };
}

async function readOrderBook(isLong) {
  let orderStoreKey1 = "0";
  let orderStoreKey2 = "1";
  let orderBookKey = "Long";

  if (!isLong) {
    orderStoreKey1 = "2";
    orderStoreKey2 = "3";
    orderBookKey = "Short";
  }

  const orderStoreOpen = await readOrderStoreContract(orderStoreKey1);
  const orderStoreClose = await readOrderStoreContract(orderStoreKey2);

  const orderBook = await readOB({
    isLong: isLong,
  });

  return {
    orderBook: orderBook,
    orderStoreOpen: orderStoreOpen,
    orderStoreClose: orderStoreClose,
  };
}

async function readOrderBookFromMarketID({ marketID, isLong }) {
  let orderStoreKey1 = "0";
  let orderStoreKey2 = "1";
  let orderBookKey = "Long";

  if (!isLong) {
    orderStoreKey1 = "2";
    orderStoreKey2 = "3";
    orderBookKey = "Short";
  }

  const orderStoreOpen = await readOrderStoreContractFromMarketID({
    marketID,
    label: orderStoreKey1,
  });
  const orderStoreClose = await readOrderStoreContractFromMarketID({
    marketID,
    label: orderStoreKey2,
  });

  const orderBook = await readOrderBookContractFromMarketID({
    marketID,
    isLong: isLong,
  });

  return {
    orderBook: orderBook,
    orderStoreOpen: orderStoreOpen,
    orderStoreClose: orderStoreClose,
  };
}

async function deployFactory() {
  return await deployMarketFactory();
}

module.exports = {
  deployOrderBook,
  deployFactory,
  readOrderBook,
  readOrderBookFromMarketID,
};
