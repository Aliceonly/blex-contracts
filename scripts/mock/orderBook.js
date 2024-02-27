const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
  deployContract,
} = require("../utils/helpers");

async function deployMockOrderBook(writeJson = true) {
  const pa = await deployOrConnect("MockOrderBook", []);
  const result = {
    MockOrderBook: pa.address,
  };
  if (writeJson) writeContractAddresses(result);

  return pa;
}

async function readMockOrderBook() {
  const pa = await readDeployedContract("MockOrderBook");
  return pa;
}

async function setOpenStore(open) {
  const pa = await readDeployedContract("MockOrderBook");
  return await pa.setOpenStore(open);
}

async function setCloseStore(close) {
  const pa = await readDeployedContract("MockOrderBook");
  return await pa.setCloseStore(close);
}

module.exports = {
  deployMockOrderBook,
  readMockOrderBook,
  setOpenStore,
  setCloseStore,
};
