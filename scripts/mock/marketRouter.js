const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployMockMarketRouter(writeJson = true) {
  const mr = await deployOrConnect("MockMarketRouter", []);
  const result = {
    MockMarketRouter: mr.address,
  };

  if (writeJson) writeContractAddresses(result);

  return mr;
}

async function readMockMarketRouterContract() {
  const mr = await readDeployedContract("MockMarketRouter");
  return mr;
}

module.exports = {
  deployMockMarketRouter,
  readMockMarketRouterContract,
};
