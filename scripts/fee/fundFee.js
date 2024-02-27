const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  grantRoleIfNotGranted,
  writeContractAddresses,
  deployContractAndReturnReceipt,
} = require("../utils/helpers");

async function deployFundFee(feeVaultAddr, writeJson = true) {
  const { contract: fundFee, receipt } = await deployContractAndReturnReceipt(
    "FundFee",
    [feeVaultAddr]
  );

  const result = {
    FundFee: fundFee.address,
    ["FundFee_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return fundFee;
}

async function readFundFeeContract() {
  const fee = await readDeployedContract("FundFee");
  return fee;
}

async function setMinRateLimit(limit) {
  const fundFee = await readDeployedContract("FundFee");
  return await handleTx(fundFee.setMinRateLimit(limit), "setMinRateLimit");
}

async function setFundingInterval(markets, intervals) {
  const fundFee = await readDeployedContract("FundFee");
  return await fundFee.setFundingInterval(markets, intervals);
}

async function addSkipTime(startTime, endTime) {
  const fundFee = await readDeployedContract("FundFee");
  return await fundFee.addSkipTime(startTime, endTime);
}

async function getFundingRate(marketAddr, isLong) {
  const fundFee = await readFundFeeContract();
  const rate = await fundFee.getFundingRate(marketAddr, isLong);
  return rate;
}

async function getFundingFee(marketAddr, size, entryFundingRate, isLong) {
  const fundFee = await readFundFeeContract();
  const fee = await fundFee.getFundingFee(
    marketAddr,
    size,
    entryFundingRate,
    isLong
  );
  return fee;
}

async function updateCumulativeFundingRate(marketAddr, longSize, shortSize) {
  const fundFee = await readFundFeeContract();
  return await fundFee.updateCumulativeFundingRate(
    marketAddr,
    longSize,
    shortSize
  );
}

async function getMinRateLimit() {
  const fundFee = await readDeployedContract("FundFee");
  return await fundFee.minRateLimit();
}

async function getFundingInterval(marketAddr) {
  const fundFee = await readFundFeeContract();
  const interval = await fundFee.fundingIntervals(marketAddr);
  return interval;
}

async function getNextFundingRate(marketAddr, longSize, shortSize) {
  const fundFee = await readFundFeeContract();
  return await fundFee.getNextFundingRate(marketAddr, longSize, shortSize);
}

module.exports = {
  deployFundFee,
  readFundFeeContract,
  setMinRateLimit,
  setFundingInterval,
  addSkipTime,
  getFundingRate,
  getFundingFee,
  updateCumulativeFundingRate,
  getMinRateLimit,
  getFundingInterval,
  getNextFundingRate,
};
