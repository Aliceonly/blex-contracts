const {
  deployOrConnect,
  readDeployedContract,
  readDeployedContract2,
  writeContractAddresses,
  waitTx,
} = require("../utils/helpers");

async function deployAutoLiqMock(marketAddr, isLong, writeJson = true) {
  let label = "amLiq_" + (isLong ? "Long" : "Short") + marketAddr;
  const ao = await deployOrConnect(
    "AutoLiquidateMock",
    [marketAddr, isLong],
    label
  );
  const result = {
    [label]: ao.address,
  };

  if (writeJson) writeContractAddresses(result);

  return ao;
}

async function readAutoLiqMock(marketAddr, isLong) {
  let label = "amLiq_" + (isLong ? "Long" : "Short") + marketAddr;
  const al = await readDeployedContract2({
    name: "AutoLiquidateMock",
    label: label,
  });
  return al;
}

async function checkIndexAutoLiqMock(first, last, marketAddr, isLong) {
  let al = await readAutoLiqMock(marketAddr, isLong);

  return await al.checkIndex(first, last);
}

async function performIndexAutoLiqMock(first, last, marketAddr, isLong) {
  let al = await readAutoLiqMock(marketAddr, isLong);

  return await waitTx(al.performIndex(first, last), "performIndex AutoLiqMock");
}

async function setLimitAutoLiqMock(limit, marketAddr, isLong) {
  let al = await readAutoLiqMock(marketAddr, isLong);

  return await waitTx(al.setLimit(limit), "setLimit AutoLiqMock");
}

module.exports = {
  deployAutoLiqMock,
  readAutoLiqMock,
  checkIndexAutoLiqMock,
  performIndexAutoLiqMock,
  setLimitAutoLiqMock,
};
