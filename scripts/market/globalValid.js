const {
  deployContract,
  deployOrConnect,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  deployContractAndReturnReceipt,
} = require("../utils/helpers");

async function deployGlobalValid(writeJson = true) {
  const { contract: globalValid, receipt } =
    await deployContractAndReturnReceipt("GlobalValid", []);

  const result = {
    GlobalValid: globalValid.address,
    ["GlobalValid_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return globalValid;
}

async function readGlobalValidContract() {
  const globalValid = await readDeployedContract("GlobalValid");
  return globalValid;
}

async function setMaxSizeLimit(limit) {
  const globalValid = await readGlobalValidContract();
  await handleTx(
    globalValid.setMaxSizeLimit(limit),
    "globalValid.setMaxSizeLimit"
  );
}

async function setMaxNetSizeLimit(limit) {
  const globalValid = await readGlobalValidContract();
  await handleTx(
    globalValid.setMaxNetSizeLimit(limit),
    "globalValid.setMaxNetSizeLimit"
  );
}

async function setMaxUserNetSizeLimit(limit) {
  const globalValid = await readGlobalValidContract();
  await handleTx(
    globalValid.setMaxUserNetSizeLimit(limit),
    "globalValid.setMaxUserNetSizeLimit"
  );
}

async function setMaxMarketSizeLimit(marketAddr, limit) {
  const globalValid = await readGlobalValidContract();
  await handleTx(
    globalValid.setMaxMarketSizeLimit(marketAddr, limit),
    "globalValid.setMaxMarketSizeLimit"
  );
}

async function getMaxMarketSizeLimit(marketAddr) {
  const globalValid = await readGlobalValidContract();
  return await globalValid.maxMarketSizeLimit(marketAddr);
}

async function getMaxUserNetSizeLimit() {
  const globalValid = await readGlobalValidContract();

  return await globalValid.maxUserNetSizeLimit();
}

async function getMaxSizeLimit() {
  const globalValid = await readGlobalValidContract();
  return await globalValid.maxSizeLimit();
}

async function getMaxNetSizeLimit() {
  const globalValid = await readGlobalValidContract();

  return await globalValid.maxNetSizeLimit();
}

module.exports = {
  deployGlobalValid,
  readGlobalValidContract,
  setMaxSizeLimit,
  setMaxNetSizeLimit,
  setMaxUserNetSizeLimit,
  setMaxMarketSizeLimit,
  getMaxMarketSizeLimit,
  getMaxUserNetSizeLimit,
  getMaxSizeLimit,
  getMaxNetSizeLimit,
};
