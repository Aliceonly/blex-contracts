const {
    upgradeContract
} = require("../utils/helpers");
// const { deployReferral, readReferral } = require("../referral/deploy")

async function replaceReferral() {
    await upgradeContract("Referral")
}

module.exports = {
    replaceReferral
};