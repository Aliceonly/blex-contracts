const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployMockChainLinkPrice(writeJson) {
  const mockPrice = await deployOrConnect("MockChainLinkPrice", []);

  const result = {
    MockChainLinkPrice: mockPrice.address,
  };
  if (writeJson) writeContractAddresses(result);

  return mockPrice;
}

async function readMockChainLinkContract() {
  const mockPrice = await readDeployedContract("MockChainLinkPrice");
  return mockPrice;
}

async function setRound(round) {
  const mockPrice = await readMockChainLinkContract();
  return await mockPrice.setRound(round);
}

async function setLatestAnswer(answer) {
  const mockPrice = await readMockChainLinkContract();
  return await mockPrice.setLatestAnswer(answer);
}

async function setTimestamp(timestamp) {
  const mockPrice = await readMockChainLinkContract();
  return await mockPrice.setTimestamp(timestamp);
}

async function getLatestAnswer() {
  const mockPrice = await readMockChainLinkContract();
  return await mockPrice.latestAnswer();
}

module.exports = {
  deployMockChainLinkPrice,
  readMockChainLinkContract,
  setRound,
  setLatestAnswer,
  setTimestamp,
  getLatestAnswer,
};
