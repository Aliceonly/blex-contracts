const { handleTx, deployOrConnect, writeContractAddresses } = require("./utils/helpers")

async function main() {
    await deployOrConnect("BatchTransfer")
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})