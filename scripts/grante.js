const {
  handleTx,
  grantRoleIfNotGranted,
  contractAt,
} = require("./utils/helpers");

const autoJson = require("../contract-addresses-avalancheTest-am.json");

async function granteAM(market) {
  for (let key in autoJson) {
    await grantRoleIfNotGranted(
      market, 
      "ROLE_POS_KEEPER", 
      autoJson[key], 
      "market.grante.pos_keeper"
    );
  }
}

async function main() {
  const btcMarket = "0xFd6e8bb09a646df6d6A5C152f3e879f0244B1074";
  const ethMarket = "0x93d9485a0ebcF5902dBf3cEc5746974d6bafC3F3";

	const BtcMarketContract = await contractAt("Market", btcMarket);
	const EthMarketContract = await contractAt("Market", ethMarket);

  await granteAM(BtcMarketContract);
  await granteAM(EthMarketContract);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
