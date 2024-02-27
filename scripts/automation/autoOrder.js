const { expect } = require("chai");
const {
  deployContractAndReturnReceipt,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployAutoOrder(
  marketName,
  marketAddr,
  isIncrease,
  isLong,
  writeJson = true
) {
  let label = marketName;
  label = isIncrease ? label + "Open" : label + "Close";
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoOrder" + label;
  const number_key = key + "_block";

  const { contract: autoOrder, receipt } = await deployContractAndReturnReceipt(
    "AutoOrder",
    [marketAddr, isIncrease, isLong],
    key
  );

  const result = {
    [key]: autoOrder.address,
    [number_key]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return autoOrder;
}

async function readAutoOrderContract(marketName, isIncrease, isLong) {
  let label = marketName;
  label = isIncrease ? label + "Open" : label + "Close";
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoOrder" + label;

  const autoOrder = await readDeployedContract("AutoOrder", [], key);
  return autoOrder;
}
async function readAutoOrderContractFromMarketID({
  marketName,
  isIncrease,
  isLong,
  marketID,
}) {
  let label = marketName;
  label = isIncrease ? label + "Open" : label + "Close";
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoOrder" + label + marketID;

  const autoOrder = await readDeployedContract("AutoOrder", [], key);
  return autoOrder;
}
async function checkIndexAutoOrder(
  first,
  last,
  marketName,
  isIncrease,
  isLong
) {
  let autoOrder = await readAutoOrderContract(marketName, isIncrease, isLong);

  return await autoOrder.checkIndex(first, last);
}

async function performIndexAutoOrder(
  lower,
  upper,
  marketName,
  isIncrease,
  isLong
) {
  let autoOrder = await readAutoOrderContract(marketName, isIncrease, isLong);

  return await autoOrder.performIndex(lower, upper);
}

async function connectPerformIndexAutoOrderRevert(
  user,
  lower,
  upper,
  marketName,
  isIncrease,
  isLong,
  reason
) {
  let autoOrder = await readAutoOrderContract(marketName, isIncrease, isLong);
  return await expect(
    autoOrder.connect(user).performIndex(lower, upper)
  ).to.be.rejectedWith(reason);
}

module.exports = {
  deployAutoOrder,
  readAutoOrderContract,
  checkIndexAutoOrder,
  performIndexAutoOrder,
  readAutoOrderContractFromMarketID,
  connectPerformIndexAutoOrderRevert,
};
