const arguments = process.argv;

const { fetchContractAddresses } = require("./utils/helpers");

async function uploadToTenderfly(name, addr) {
  // check  contract on Tenderly
  try {
    await hre.tenderly.persistArtifacts({
      name: name,
      address: addr,
    });
    await hre.tenderly.check({
      name: name,
      address: addr,
    });
  } catch (error) {
    if (String(error).indexOf("Artifact") < 0) {
      console.log(error);
      process.exit();
    }
  }
}

async function main() {
  const data = await fetchContractAddresses();
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let key = element.name;
    const value = element.address;
    try {
      let found = false;
      for (let index = 0; index < 4; index++) {
        if (key.indexOf(String(index)) >= 0) {
          found = true;
          await uploadToTenderfly(key.split(String(index))[0], value);
        }
      }
      if (found) continue;

      key = String(key).replace("Impl", "");
      key = String(key).replace("Short", "");
      key = String(key).replace("Long", "");
      key = String(key).replace("Close", "");
      key = String(key).replace("Open", "");

      await uploadToTenderfly(key, value);
    } catch (error) {
      console.log(error);
      break;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
