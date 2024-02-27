const {
  deployServiceAllMarket,
  deployTmpTestFactoryContract,
} = require("./deployAllContract");

async function main() {
  let allContracts = await deployTmpTestFactoryContract();
  console.log(allContracts.USDC.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
