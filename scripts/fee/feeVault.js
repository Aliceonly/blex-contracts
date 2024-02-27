const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  deployContractAndReturnReceipt,
  handleTx,
} = require("../utils/helpers");

async function deployFeeVault(writeJson = true) {
  const { contract: vault, receipt } = await deployContractAndReturnReceipt(
    "FeeVault",
    []
  );
  const result = {
    FeeVault: vault.address,
    ["FeeVault_block"]: receipt.blockNumber,
  };
  console.log("writeJson", writeJson);
  if (writeJson) writeContractAddresses(result);

  return vault;
}

async function readFeeVaultContract() {
  const vault = await readDeployedContract("FeeVault");
  return vault;
}

async function getMarketFees(market) {
  const vault = await readFeeVaultContract();
  return await vault.marketFees(market);
}

async function getAccountFees(account) {
  const vault = await readFeeVaultContract();
  return await vault.accountFees(account);
}

async function getKindFees(types) {
  const vault = await readFeeVaultContract();
  return await vault.kindFees(types);
}

async function getMarketKindFees(market, types) {
  const vault = await readFeeVaultContract();
  return await vault.marketKindFees(market, types);
}

async function getAccountKindFees(account, types) {
  const vault = await readFeeVaultContract();
  return await vault.accountKindFees(account, types);
}

async function getToAccountFees(account) {
  const vault = await readFeeVaultContract();
  return await vault.toAccountFees(account);
}

async function getToKindFees(types) {
  const vault = await readFeeVaultContract();
  return await vault.toKindFees(types);
}

async function withdraw(token, to, amount) {
  const vault = await readFeeVaultContract();
  return await vault.withdraw(token, to, amount);
}

async function increaseFees(marketAddr, account, fees) {
  const vault = await readFeeVaultContract();
  return await vault.increaseFees(marketAddr, account, fees);
}

async function decreaseFees(marketAddr, account, fees) {
  const vault = await readFeeVaultContract();
  return await vault.decreaseFees(marketAddr, account, fees);
}

async function updateGlobalFundingRate(marketAddr, rates, timestamp) {
  const vault = await readFeeVaultContract();
  await handleTx(
    vault.updateGlobalFundingRate(
      marketAddr,
      rates.longRate,
      rates.shortRate,
      rates.nextLongRate,
      rates.nextShortRate,
      timestamp
    ),
    "vault.updateGlobalFundingRate"
  );
}

async function getCumulativeFundingRates(marketAddr, isLong) {
  const vault = await readFeeVaultContract();
  const rates = await vault.cumulativeFundingRates(marketAddr, isLong);
  return rates;
}

async function getFundingRates(marketAddr, isLong) {
  const vault = await readFeeVaultContract();
  const rates = await vault.fundingRates(marketAddr, isLong);
  return rates;
}

async function getLastFundingTimes(marketAddr) {
  const vault = await readFeeVaultContract();
  const times = await vault.lastFundingTimes(marketAddr);
  return times;
}

module.exports = {
  deployFeeVault,
  readFeeVaultContract,
  updateGlobalFundingRate,
  getCumulativeFundingRates,
  getFundingRates,
  getLastFundingTimes,
  withdraw,
};
