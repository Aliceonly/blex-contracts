const {
  deployOrConnect,
  writeContractAddresses,
  readDeployedContract,
} = require("../utils/helpers");

async function deployReferral(writeJson = true) {
  const referral = await deployOrConnect("Referral");

  const result = {
    Referral: referral.address,
  };
  if (writeJson) writeContractAddresses(result);

  return referral;
}

async function readReferral() {
  const rf = await readDeployedContract("Referral");
  return rf;
}

async function initializeReferral() {
  const rf = await readReferral();
  return await rf.initialize();
}

async function setTier(tierId, totalRebate, discountShare) {
  const rf = await readReferral();
  return await rf.setTier(tierId, totalRebate, discountShare);
}

async function getTigers(tierId) {
  const rf = await readReferral();
  return await rf.tiers(tierId);
}

async function setReferrerTier(referrer, tierId) {
  const rf = await readReferral();
  return await rf.setReferrerTier(referrer, tierId);
}

async function getReferrerTier(referrer) {
  const rf = await readReferral();
  return await rf.referrerTiers(referrer);
}

async function setReferrerDiscountShare(account, discountShare) {
  const rf = await readReferral();
  return await rf.setReferrerDiscountShare(account, discountShare);
}

async function getReferrerDiscountShares(account) {
  const rf = await readReferral();
  return await rf.referrerDiscountShares(account);
}

async function setTraderReferralCode(account, code) {
  const rf = await readReferral();
  return await rf.setTraderReferralCode(account, code);
}

async function getTraderReferralCodes(account) {
  const rf = await readReferral();
  return await rf.traderReferralCodes(account);
}

async function setTraderReferralCodeByUser(code) {
  const rf = await readReferral();
  return await rf.setTraderReferralCodeByUser(code);
}

async function registerCode(code) {
  const rf = await readReferral();
  return await rf.registerCode(code);
}

async function getCodeOwner(code) {
  const rf = await readReferral();
  return await rf.codeOwners(code);
}
async function setCodeOwner(code, newAccount) {
  const rf = await readReferral();
  return await rf.setCodeOwner(code, newAccount);
}

async function govSetCodeOwner(code, newAccount) {
  const rf = await readReferral();
  return await rf.govSetCodeOwner(code, newAccount);
}

async function getTraderReferralInfo(account) {
  const rf = await readReferral();
  return await rf.getTraderReferralInfo(account);
}

async function getCodeOwners(codes) {
  const rf = await readReferral();
  return await rf.getCodeOwners(codes);
}

async function updatePositionCallback(params) {
  const rf = await readReferral();
  return await rf.updatePositionCallback(params);
}

module.exports = {
  deployReferral,
  readReferral,
  setTier,
  getTigers,
  setReferrerTier,
  getReferrerTier,
  setReferrerDiscountShare,
  getReferrerDiscountShares,
  setTraderReferralCode,
  getTraderReferralCodes,
  setTraderReferralCodeByUser,
  registerCode,
  setCodeOwner,
  govSetCodeOwner,
  getTraderReferralInfo,
  getCodeOwners,
  getCodeOwner,
  updatePositionCallback,
  initializeReferral,
};
