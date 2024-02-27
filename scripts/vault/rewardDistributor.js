const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  deployUpgradeable,
  getContractAt,
} = require("../utils/helpers");

async function deployRewardDistributor(writeJson = true) {
  const distributor = await deployOrConnect("RewardDistributor", []);

  const result = {
    RewardDistributor: distributor.address,
  };
  if (writeJson) writeContractAddresses(result);

  return distributor;
}

async function deployRewardDistributor(writeJson = true) {
  const { implementation, proxy, receipt } = await deployUpgradeable(
    "RewardDistributor",
    []
  );
  const result = {
    RewardDistributor: proxy.address,
    ["RewardDistributorImpl"]: implementation.address,
    ["RewardDistributor_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return getContractAt("RewardDistributor", proxy.address);
}

async function readRewardDistributorContract() {
  return await readDeployedContract("RewardDistributor");
}

async function initialize(rewardTokenAddr, rewardTrackerAddr) {
  const distributor = await readRewardDistributorContract();
  return await distributor.initialize(rewardTokenAddr, rewardTrackerAddr);
}

async function getRewardTracker() {
  const distributor = await readRewardDistributorContract();
  return await distributor.rewardTracker();
}

async function getRewardToken() {
  const distributor = await readRewardDistributorContract();
  return await distributor.rewardToken();
}

async function setTokensPerInterval(amount) {
  const distributor = await readRewardDistributorContract();
  // await handleTx(
  //   distributor.setTokensPerInterval(amount),
  //   "rewardDistributor.setTokensPerInterval"
  // );

  return await distributor.setTokensPerInterval(amount);
}

async function getTokensPerInterval() {
  const distributor = await readRewardDistributorContract();
  return await distributor.tokensPerInterval();
}

async function updateLastDistributionTime() {
  const distributor = await readRewardDistributorContract();
  // await handleTx(
  //   distributor.updateLastDistributionTime(),
  //   "rewardDistributor.updateLastDistributionTime"
  // );

  return await distributor.updateLastDistributionTime();
}

async function getLastDistributionTime() {
  const distributor = await readRewardDistributorContract();

  return await distributor.lastDistributionTime();
}

async function withdrawToken(tokenAddr, toAddress, amount) {
  const distributor = await readRewardDistributorContract();
  // await handleTx(
  //   distributor.withdrawToken(tokenAddr, toAddress, amount),
  //   "rewardDistributor.withdrawToken"
  // );
  return await distributor.withdrawToken(tokenAddr, toAddress, amount);
}

async function distribute() {
  const distributor = await readRewardDistributorContract();
  // await handleTx(distributor.distribute(), "rewardDistributor.distribute");
  return await distributor.distribute();
}

async function pendingRewards() {
  const distributor = await readRewardDistributorContract();
  return distributor.pendingRewards();
}

module.exports = {
  readRewardDistributorContract,
  initialize,
  setTokensPerInterval,
  getTokensPerInterval,
  getRewardTracker,
  getRewardToken,
  withdrawToken,
  updateLastDistributionTime,
  getLastDistributionTime,
  distribute,
  pendingRewards,
  deployRewardDistributor,
};
