const {
  deployContractAndReturnReceipt,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployAutoLiquidate(
  marketName,
  marketAddr,
  isLong,
  writeJson = true
) {
  let label = marketName;
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoLiquidate" + label;
  const number_key = key + "_block";

  const { contract: autoLiq, receipt } = await deployContractAndReturnReceipt(
    "AutoLiquidate",
    [marketAddr, isLong],
    key
  );

  const result = {
    [key]: autoLiq.address,
    [number_key]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return autoLiq;
}

async function readAutoLiquidateContract(marketName, isLong) {
  let label = marketName;
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoLiquidate" + label;

  const autoLiq = await readDeployedContract("AutoLiquidate", [], key);
  return autoLiq;
}

async function readAutoLiquidateContractFromMarketID({
  marketName,
  isLong,
  marketID,
}) {
  let label = marketName;
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoLiquidate" + label + marketID;

  const autoLiq = await readDeployedContract("AutoLiquidate", [], key);
  return autoLiq;
}

async function checkIndexAutoLiq(first, last, marketName, isLong) {
  let al = await readAutoLiquidateContract(marketName, isLong);
  return await al.checkIndex(first, last);
}

async function performIndexAutoLiq(lower, upper, marketName, isLong) {
  let al = await readAutoLiquidateContract(marketName, isLong);
  return await al.performIndex(lower, upper);
}

module.exports = {
  deployAutoLiquidate,
  readAutoLiquidateContract,
  checkIndexAutoLiq,
  performIndexAutoLiq,
  readAutoLiquidateContractFromMarketID,
};
