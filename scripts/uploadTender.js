const arguments = process.argv;

const jsonAddresses = require(`../contract-addresses-avalancheTest-BTC.json`);

async function uploadToTenderfly(name, addr) {
  await hre.tenderly.persistArtifacts({
    name: name,
    address: addr,
  });
  // check  contract on Tenderly
  await hre.tenderly.check({
    name: name,
    address: addr,
  });
}

async function main() {
  for (let key in jsonAddresses) {
    if (jsonAddresses.hasOwnProperty(key)) {
      let value = jsonAddresses[key];
      try {
        let found = false;
        for (let index = 0; index < 4; index++) {
          if (key.indexOf(String(index)) >= 0) {
            found = true;
            await uploadToTenderfly(key.split(String(index))[0], value);
          }
        }
        if (found) continue;
        if (key.indexOf("Impl") >= 0)
          await uploadToTenderfly(key.split("Impl")[0], value);
        else await uploadToTenderfly(key, value);
      } catch (error) {}
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
