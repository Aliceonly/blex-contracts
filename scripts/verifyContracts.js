

const arguments = process.argv

const { readMarketFactoryContract } = require("./market/marketFactory");
const { readCoreVaultContract } = require("./vault/coreVault.js");
const { fetchContractAddresses } = require("./utils/helpers")
require("@nomicfoundation/hardhat-verify");

async function verifyContractsBlex(name, addr) {

    //npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
    const marketFactory = await readMarketFactoryContract()
    const coreVault = await readCoreVaultContract()

    if (name == "Market"
        || name == "MarketReader"
        || name == "MarketValid"
        || name == "FeeRouter"
    ) {
        await hre.run("verify:verify", {
            address: addr,
            constructorArguments: [marketFactory.address],
        });
    } else if (name == "FundFee"


    ) {
        await hre.run("verify:verify", {
            address: addr,
            constructorArguments: [coreVault.address],
        });
    } else if (name == "FastPriceFeed") {
        await hre.run("verify:verify", {
            address: addr,
            constructorArguments: [
                300, 3600, 0, 1000
            ],
        });
    } else {
        await hre.run("verify:verify", {
            address: addr,
            constructorArguments: [],
        });
    }















}

async function main() {

    const data = await fetchContractAddresses();
    for (let index = 0; index < data.length; index++) {
        const element = data[index];
        let key = element.name
        const value = element.address
        try {
            let found = false
            for (let index = 0; index < 4; index++) {
                if (key.indexOf(String(index)) >= 0) {
                    found = true
                    await verifyContractsBlex(key.split(String(index))[0], value)
                }
            }
            if (found) continue

            key = String(key).replace("Impl", "")
            key = String(key).replace("Short", "")
            key = String(key).replace("Long", "")
            key = String(key).replace("Close", "")
            key = String(key).replace("Open", "")

            await verifyContractsBlex(key, value)

        } catch (error) {
            console.log(error);
            break
        }

    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
