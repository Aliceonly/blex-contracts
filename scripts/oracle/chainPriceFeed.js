const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployChainPriceFeed(writeJson) {
  const chainPrice = await deployOrConnect("ChainPriceFeed", []);

  const result = {
    ChainPriceFeed: chainPrice.address,
  };
  if (writeJson) writeContractAddresses(result);

  return chainPrice;
}

async function readChainPriceContract() {
  const chainPrice = await readDeployedContract("ChainPriceFeed");
  return chainPrice;
}

async function setSampleSpace(num) {
  const chainPrice = await readDeployedContract("ChainPriceFeed");
  await handleTx(chainPrice.setSampleSpace(num), "chainPrice.setSampleSpace");
}

async function setPriceFeed(tokenAddr, priceFeed, decimal, user = null) {
  const chainPrice = await readDeployedContract("ChainPriceFeed");
  // getDeployer
  await handleTx(
    chainPrice.connect(user).setPriceFeed(tokenAddr, priceFeed, decimal),
    "chainPrice.setPriceFeed"
  );
}

async function getLatestPrice(tokenAddr) {
  const chainPrice = await readDeployedContract("ChainPriceFeed");
  return chainPrice.getLatestPrice(tokenAddr);
}

module.exports = {
  deployChainPriceFeed,
  readChainPriceContract,
  setSampleSpace,
  setPriceFeed,
  getLatestPrice,
};
