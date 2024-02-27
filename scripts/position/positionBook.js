const {
  deployOrConnect,
  readDeployedContract2,
  handleTx,
  grantRoleIfNotGranted,
  readDeployedContract,
  writeContractAddresses,
  deployContractAndReturnReceipt,
} = require("../utils/helpers");

async function deployPositionBook(factotyAddr, writeJson = true) {
  const { contract: pb, receipt } = await deployContractAndReturnReceipt(
    "PositionBook",
    [factotyAddr]
  );

  const result = {
    PositionBook: pb.address,
    ["PositionBook_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return pb;
}

// async function readPositionBookContract(symbol) {
//   const pb = await readDeployedContract2({
//     name: "PositionBook",
//     symbol: symbol,
//   });
//   return pb;
// }

async function readPositionBookContract() {
  const pb = await readDeployedContract("PositionBook");
  return pb;
}
async function readPositionBookContractFromMarketID({ marketID }) {
  const pb = await readDeployedContract(
    "PositionBook",
    [],
    "PositionBook" + marketID
  );
  return pb;
}

async function initPositionBook(marketAddr) {
  const pb = await readDeployedContract("PositionBook");
  return await handleTx(pb.initialize(marketAddr), "initPositionBook");
}

async function initPositionBooks(marketAddr) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.initialize(marketAddr);
}
async function getMarketAddr() {
  const pb = await readDeployedContract("PositionBook");
  return await pb.market();
}

async function getShortStore() {
  const pb = await readDeployedContract("PositionBook");
  return await pb.shortStore();
}

async function getLongStore() {
  const pb = await readDeployedContract("PositionBook");
  return await pb.longStore();
}

async function getMarketSizes() {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getMarketSizes();
}

async function getAccountSize(account) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getAccountSize(account);
}

async function getPosition(account, markPrice, isLong) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getPosition(account, markPrice, isLong);
}

async function getPositions(account) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getPositions(account);
}

async function getPositionKeys(start, end, isLong) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getPositionKeys(start, end, isLong);
}

async function getPositionCount(isLong) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getPositionCount(isLong);
}

async function getPNL(account, sizeDelta, markPrice, isLong) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getPNL(account, sizeDelta, markPrice, isLong);
}

async function getMarketPNL(markPrice) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.getMarketPNL(markPrice);
}

async function increasePosition(
  account,
  collateralDelta,
  sizeDelta,
  markPrice,
  fundingRate,
  isLong
) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.increasePosition(
    account,
    collateralDelta,
    sizeDelta,
    markPrice,
    fundingRate,
    isLong
  );
}

async function decreasePosition(
  account,
  collateralDelta,
  sizeDelta,
  fundingRate,
  isLong
) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.decreasePosition(
    account,
    collateralDelta,
    sizeDelta,
    fundingRate,
    isLong
  );
}
async function decreaseCollateralFromCancelInvalidOrder(
  account,
  collateralDelta,
  isLong
) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.decreaseCollateralFromCancelInvalidOrder(
    account,
    collateralDelta,
    isLong
  );
}

async function liquidatePosition(account, markPrice, isLong) {
  const pb = await readDeployedContract("PositionBook");
  return await pb.liquidatePosition(account, markPrice, isLong);
}

module.exports = {
  deployPositionBook,
  readPositionBookContract,
  initPositionBook,
  getMarketSizes,
  getAccountSize,
  getPosition,
  getPositions,
  getPositionKeys,
  getPositionCount,
  getPNL,
  getMarketPNL,
  increasePosition,
  decreasePosition,
  decreaseCollateralFromCancelInvalidOrder,
  liquidatePosition,
  getMarketAddr,
  getShortStore,
  getLongStore,
  initPositionBooks,
  readPositionBookContractFromMarketID,
};
