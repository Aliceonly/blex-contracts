const {
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  deployContract,
} = require("../utils/helpers");

async function deployPositionAddMgr(writeJson = true) {
  const positionAddMgr = await deployOrConnect("PositionAddMgr", []);

  const result = {
    PositionAddMgr: positionAddMgr.address,
  };
  if (writeJson) writeContractAddresses(result);

  return positionAddMgr;
}

async function readPositionAddMgrContract() {
  const positionAddMgr = await readDeployedContract("PositionAddMgr");
  return positionAddMgr;
}

async function increasePositionWithOrders(input) {
  const positionAddMgr = await readDeployedContract("PositionAddMgr");
  return await positionAddMgr.increasePositionWithOrders(input);
}

async function execOrderKey(exeOrder, params) {
  const positionAddMgr = await readDeployedContract("PositionAddMgr");
  return await positionAddMgr.execOrderKey(exeOrder, params);
}

module.exports = {
  deployPositionAddMgr,
  readPositionAddMgrContract,
  increasePositionWithOrders,
  execOrderKey,
};
