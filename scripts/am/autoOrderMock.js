const { waffle } = require("hardhat");
const {
  deployOrConnect,
  readDeployedContract,
  readDeployedContract2,
  writeContractAddresses,
  deployContractAndReturnReceipt,
  waitTx,
} = require("../utils/helpers");

async function deployAutoOrderMock(
  marketAddr,
  isOpen,
  isLong,
  writeJson = true
) {
  let labelName =
    "ETH" +
    "Auto" +
    (isOpen ? "Open" : "Close") +
    (isLong ? "Long" : "Short") +
    "OrderMock";
  const { contract: orderMock, receipt } = await deployContractAndReturnReceipt(
    "AutoOrderMock",
    [marketAddr, isOpen, isLong],
    labelName
  );

  const result = {
    [labelName]: orderMock.address,
    [labelName + "_block"]: receipt.blockNumber,
  };

  if (writeJson) writeContractAddresses(result);

  return orderMock;
}

async function readAutoOrderMock(isOpen, isLong) {
  let label =
    "ETH" +
    "Auto" +
    (isOpen ? "Open" : "Close") +
    (isLong ? "Long" : "Short") +
    "OrderMock";

  //"AutoOrderMock",label
  const ao = await readDeployedContract2({
    name: "AutoOrderMock",
    label: label,
  });
  return ao;
}

async function checkIndexAutoOrderMock(first, last, isOpen, isLong) {
  let ao = await readAutoOrderMock(isOpen, isLong);
  return await ao.checkIndex(first, last);
}

async function performIndexAutoOrderMock(lower, upper, isOpen, isLong) {
  let ao = await readAutoOrderMock(isOpen, isLong);
  return await waitTx(
    ao.performIndex(lower, upper),
    "performIndex AutoOrderMock"
  );
}

module.exports = {
  deployAutoOrderMock,
  readAutoOrderMock,
  checkIndexAutoOrderMock,
  performIndexAutoOrderMock,
};
