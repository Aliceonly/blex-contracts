const { ethers } = require("hardhat");
const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
} = require("../utils/helpers");

async function deployOracle(writeJson = true) {
  const oracle = await deployOrConnect("MockOracle", []);
  const result = {
    MockOracle: oracle.address,
  };
  if (writeJson) writeContractAddresses(result);

  return oracle;
}

async function readOracleContract() {
  const oracle = await readDeployedContract("MockOracle");
  return oracle;
}

async function setPrice(tokenAddr, price) {
  const oracle = await readDeployedContract("MockOracle");

  let prices = ethers.utils.parseUnits(price + "", 30);

  await handleTx(oracle.setPrice(tokenAddr, prices), "MockOracle setPrice");
}

async function setPriceMis(tokenAddr, price) {
  const oracle = await readDeployedContract("MockOracle");
  await handleTx(oracle.setPrice(tokenAddr, price), "MockOracle setPrice");
}

async function getPrice(tokenAddr, maximise) {
  const oracle = await readDeployedContract("MockOracle");
  return await oracle.getPrice(tokenAddr, maximise);
}

module.exports = {
  deployOracle,
  readOracleContract,
  setPrice,
  getPrice,
  setPriceMis,
};
