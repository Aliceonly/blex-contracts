const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
  deployContract,
} = require("../utils/helpers");

async function deployMockMarketVaildSub(writeJson = true) {
  const mv = await deployOrConnect("MockMarketVaildSub", []);
  const result = {
    MockMarketVaildSub: mv.address,
  };

  if (writeJson) writeContractAddresses(result);

  return mv;
}

async function readMockMarketVaildSubContract() {
  const mv = await readDeployedContract("MockMarketVaildSub");
  return mv;
}

module.exports = {
  deployMockMarketVaildSub,
  readMockMarketVaildSubContract,
};
