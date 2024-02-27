const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
  deployContract,
} = require("../utils/helpers");

async function deployMockOrderStore(writeJson = true) {
  const pa = await deployOrConnect("MockOrderStore", []);
  const result = {
    MockOrderStore: pa.address,
  };
  if (writeJson) writeContractAddresses(result);

  return pa;
}

async function readMockOrderStore() {
  const pa = await readDeployedContract("MockOrderStore");
  return pa;
}

module.exports = {
  deployMockOrderStore,
  readMockOrderStore,
};
