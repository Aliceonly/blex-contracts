const {
  deployOrConnect,
  deployContract,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
} = require("../utils/helpers");

async function deployPositionSubMgr(writeJson = true) {
  const positionSubMgr = await deployOrConnect("PositionSubMgr", []);

	const result = {
		PositionSubMgr: positionSubMgr.address
	};
	if (writeJson)
		writeContractAddresses(result)

  return positionSubMgr;
}

async function readPositionSubMgrContract() {
  const positionSubMgr = await readDeployedContract("PositionSubMgr");
  return positionSubMgr;
}

async function decreasePosition(vars) {
  const positionSubMgr = await readDeployedContract("PositionSubMgr");
  return await positionSubMgr.decreasePosition(vars);
}

async function liquidatePositions(accounts, isLong) {
  const positionSubMgr = await readDeployedContract("PositionSubMgr");
  return await positionSubMgr.liquidatePositions(accounts, isLong);
}

module.exports = {
  deployPositionSubMgr,
  readPositionSubMgrContract,
};
