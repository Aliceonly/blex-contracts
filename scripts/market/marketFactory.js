const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployMarketFactory(writeJson) {
  const factory = await deployOrConnect("MarketFactory", []);
  const result = {
    MarketFactory: factory.address,
  };
  if (writeJson) writeContractAddresses(result);

  return factory;
}

async function readMarketFactoryContract(writeJson) {
  const factory = await readDeployedContract("MarketFactory", writeJson);
  return factory;
}

async function createMarket(inputs) {
  const factory = await readMarketFactoryContract();
  await handleTx(factory.create(inputs), "factory.create");
}

async function getMarketNumber() {
  const factory = await readMarketFactoryContract();

  return await factory.allMarketsLength();
}

async function getMarketFactoryContract(marketAddr) {
  const factory = await readMarketFactoryContract();

  return await factory.getMarket(marketAddr);
}

async function getMarketsFactoryContract() {
  const factory = await readMarketFactoryContract();

  return await factory.getMarkets();
}

module.exports = {
  deployMarketFactory,
  readMarketFactoryContract,
  createMarket,
  getMarketNumber,
  getMarketFactoryContract,
  getMarketsFactoryContract,
};
