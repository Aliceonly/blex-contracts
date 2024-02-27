const { handleTx, deployOrConnect } = require("./utils/helpers")
const { ethers } = require("hardhat")
require("dotenv").config();

async function main() {
    const VaultReward = await deployOrConnect("VaultReward")
    const usdc = await deployOrConnect("USDC")
    const RewardDistributor = await deployOrConnect("RewardDistributor")
    // apr
    await handleTx(VaultReward.setAPR("64000000"))//64%
    const signer = new ethers.Wallet(process.env.USDC_MINTER, ethers.provider);
    await handleTx(usdc.connect(signer).batchMint(
        [RewardDistributor.address],
        "1000000000000")
    )//100w usdc
    // 100w usdc
    await handleTx(RewardDistributor.updateLastDistributionTime())
    await handleTx(RewardDistributor.setTokensPerInterval("10"))

}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})