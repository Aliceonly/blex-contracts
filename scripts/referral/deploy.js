const {
  writeContractAddresses,
  deployUpgradeable,
  readUpgradableDeployedContract,
  getContractAt,
  handleTx,
} = require("../utils/helpers");

async function deployReferral(writeJson = true) {
  const { implementation, proxy, receipt } = await deployUpgradeable(
    "Referral",
    "Referral"
  );
  const result = {
    Referral: proxy.address,
    ["ReferralImpl"]: implementation.address,
    ["Referral_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);
  const newRef = await getContractAt("Referral", proxy.address);
  await handleTx(newRef.initialize(), "newRef.initialize");
  return {
    referral: newRef,
  };
}

async function readReferral() {
  const vault = await readUpgradableDeployedContract("Referral");
  return vault;
}

module.exports = {
  deployReferral,
  readReferral,
};
