const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
  deployContract,
} = require("../utils/helpers");

async function deployMockPositionAddMgr(writeJson = true) {
  const pa = await deployOrConnect("MockPositionAddMgr", []);
  const result = {
    MockPositionAddMgr: pa.address,
  };
  if (writeJson) writeContractAddresses(result);

  return pa;
}

async function readMockPositionAddMgr() {
  const pa = await readDeployedContract("MockPositionAddMgr");
  return pa;
}

async function setPositionBook(book) {
  const pa = await readDeployedContract("MockPositionAddMgr");

  return await pa.setPositionBook(book);
}

async function setIndexToken(indexToken) {
  const pa = await readDeployedContract("MockPositionAddMgr");

  return await pa.setIndexToken(indexToken);
}

async function setMarketValid(newMv) {
  const pa = await readDeployedContract("MockPositionAddMgr");
  return await pa.setMarketValid(newMv);
}

async function setVaultRouter(vr) {
  const pa = await readDeployedContract("MockPositionAddMgr");

  return await pa.setVaultRouter(vr);
}

async function setOraclePrice(pf) {
  const pa = await readDeployedContract("MockPositionAddMgr");

  return await pa.setOraclePrice(pf);
}

async function setCollateralToken(token) {
  const pa = await readDeployedContract("MockPositionAddMgr");

  return await pa.setCollateralToken(token);
}

async function setFeeRouter(fr) {
  const pa = await readDeployedContract("MockPositionAddMgr");
  return await pa.setFeeRouter(fr);
}
async function setMarketRouter(mr) {
  const pa = await readDeployedContract("MockPositionAddMgr");

  return pa.setMarketRouter(mr);
}

async function increasePositionWithOrders(input) {
  const pa = await readDeployedContract("MockPositionAddMgr");
  return await pa.increasePositionWithOrders(input);
}

async function execOrderKey(exeOrder, params) {
  const pa = await readDeployedContract("MockPositionAddMgr");
  return await pa.execOrderKey(exeOrder, params);
}

async function setOrderStore(isLong, isOpen, os) {
  const pa = await readDeployedContract("MockPositionAddMgr");
  console.log(pa.address);
  return await pa.setOrderStore(isLong, isOpen, os);
}
async function setOrderBookLong(long) {
  const pa = await readDeployedContract("MockPositionAddMgr");
  return await pa.setorderBookLong(long);
}

async function setorderBookShort(short) {
  const pa = await readDeployedContract("MockPositionAddMgr");
  return await pa.setorderBookLong(short);
}

module.exports = {
  deployMockPositionAddMgr,
  readMockPositionAddMgr,
  setCollateralToken,
  setOraclePrice,
  setVaultRouter,
  setMarketValid,
  setIndexToken,
  setPositionBook,
  setFeeRouter,
  increasePositionWithOrders,
  execOrderKey,
  setOrderStore,
  setOrderBookLong,
  setorderBookShort,
  setMarketRouter,
};
