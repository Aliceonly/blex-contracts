const { upgradeContract } = require("../utils/helpers");

async function replaceRewardDistributor({ } = {}) {
	await upgradeContract("RewardDistributor")
}

module.exports = {
	replaceRewardDistributor
};