const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployMockMarketFactoryContract(writeJson = true) {
  const mf = await deployOrConnect("MockMarketFactory", []);
  const result = {
    MockMarketFactory: mf.address,
  };

  if (writeJson) writeContractAddresses(result);

  return mf;
}

async function readMockMarketFactoryContract() {
  const mf = await readDeployedContract("MockMarketFactory");
  return mf;
}

async function setMarketMockMarketFactoryContract(name, addr) {
  let mf = await readMockMarketFactoryContract();
  return await mf.setMarket(name, addr);
}

module.exports = {
  deployMockMarketFactoryContract,
  readMockMarketFactoryContract,
  setMarketMockMarketFactoryContract,
};
