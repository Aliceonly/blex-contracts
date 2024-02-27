const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
  deployContract,
} = require("../utils/helpers");

async function deployMockPositionSubMgr(writeJson = true) {
  const ps = await deployOrConnect("MockPositionSubMgr", []);
  const result = {
    MockPositionSubMgr: ps.address,
  };
  if (writeJson) writeContractAddresses(result);

  return ps;
}

async function readMockPositionSubMgr() {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return ps;
}

async function setPositionBook(book) {
  const ps = await readDeployedContract("MockPositionSubMgr");

  return await ps.setPositionBook(book);
}

async function setIndexToken(indexToken) {
  const ps = await readDeployedContract("MockPositionSubMgr");

  return await ps.setIndexToken(indexToken);
}

async function setMarketValid(newMv) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.setMarketValid(newMv);
}

async function setVaultRouter(vr) {
  const ps = await readDeployedContract("MockPositionSubMgr");

  return await ps.setVaultRouter(vr);
}

async function setOraclePrice(pf) {
  const ps = await readDeployedContract("MockPositionSubMgr");

  return await ps.setOraclePrice(pf);
}

async function setCollateralToken(token) {
  const ps = await readDeployedContract("MockPositionSubMgr");

  return await ps.setCollateralToken(token);
}

async function setFeeRouter(fr) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.setFeeRouter(fr);
}

async function decreasePosition(input) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.decreasePosition(input);
}

async function liquidatePositions(accounts, isLong) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.liquidatePositions(accounts, isLong);
}

async function execOrderKey(exeOrder, psrams) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.execOrderKey(exeOrder, psrams);
}

async function setOrderStore(isLong, isOpen, os) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.setOrderStore(isLong, isOpen, os);
}
async function setOrderBookLong(long) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.setorderBookLong(long);
}

async function setorderBookShort(short) {
  const ps = await readDeployedContract("MockPositionSubMgr");
  return await ps.setorderBookShort(short);
}

module.exports = {
  deployMockPositionSubMgr,
  readMockPositionSubMgr,
  setCollateralToken,
  setOraclePrice,
  setVaultRouter,
  setMarketValid,
  setIndexToken,
  setPositionBook,
  setFeeRouter,
  decreasePosition,
  liquidatePositions,
  execOrderKey,
  setOrderStore,
  setOrderBookLong,
  setorderBookShort,
};
