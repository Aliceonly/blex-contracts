const fs = require("fs");
const { ethers } = require("hardhat");
const path = require("path");
const { utils } = require("ethers");
const axios = require("axios");
const { network: networkObject } = require("hardhat");

const network = networkObject.name || "local-dev";
// const network = "local-dev";

// const isLocalFlow = network == "local-dev" ? true : false;
const isLocalFlow = network == "hardhat" ? true : false;

let contract_deploy_wait_list = [];
let totalGasUsed = 0;

// Create a write stream to the file
// const logFileStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), { flags: 'a+' });
// const errorFileStream = fs.createWriteStream(path.join(__dirname, 'error.txt'), { flags: 'a+' });
// const infoFileStream = fs.createWriteStream(path.join(__dirname, 'info.txt'), { flags: 'a+' });

// Redirect the console.log, console.error, and console.info to the file
// console.log = (message) => {
//   logFileStream.write(util.format(message) + '\n');
//   process.stdout.write(util.format(message) + '\n');
// };

// console.error = (message) => {
//   errorFileStream.write(util.format(message) + '\n');
//   process.stderr.write(util.format(message) + '\n');
// };

// console.info = (message) => {
//   infoFileStream.write(util.format(message) + '\n');
//   process.stdout.write(util.format(message) + '\n');
// };

// process.on('exit', (code) => {
//   logFileStream.end();
//   errorFileStream.end();
//   infoFileStream.end();
// });

function getChainId() {
  const cfg = require("../../hardhat.config.js");
  return cfg.networks[network].chainId;
}
//https://dev-api.blex.io/api/chainservice/getaddress?chainId=4002

async function fetchDevContractAddresses() {
  console.log("enter");
  try {
    let chainId = getChainId();
    console.log(chainId);
    const response = await axios.get(
      `https://dev-api.blex.io/api/chainservice/getaddress?chainId=${chainId}`
    );
    const data = response.data.data;
    return data;
  } catch (error) {
    console.error("Error occurred while fetching data:", error);
    process.exit();
    return null;
  }
}

async function fetchContractAddresses() {
  console.log("enter");
  try {
    let chainId = getChainId()
    let response
    if ([4002, 421613, 43113].includes(chainId))
      response = await axios.get(`http://dev-api.blex.io/api/chainservice/getaddress?chainId=${chainId}`);
    else
      response = await axios.get(`http://api.blex.io/api/chainservice/getaddress?chainId=${chainId}`);
    const data = response.data.data;
    return data;
  } catch (error) {
    console.error("Error occurred while fetching data:", error);
    process.exit();
    return null;
  }
}

async function fetchJson(urlString) {
  try {
    const response = await axios.get(urlString);
    const data = response.data;
    return data;
  } catch (error) {
    console.error("Error occurred while fetching data:", error);
    return null;
  }
}

function deleteAddressJson() {
  try {
    fs.unlinkSync(contractAddressesFilepath);
  } catch (error) {}
  const symbols = ["ETH", "BTC"];
  for (let index = 0; index < symbols.length; index++) {
    const tempPath = getAddress(symbols[index]);
    console.log(tempPath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

function isLocalHost() {
  const network = process.env.HARDHAT_NETWORK || "local-dev";
  return network == "localhost" || network == "local-dev";
}

async function deployContract(name, args = [], label, options) {
  if (!options && typeof label === "object") {
    label = null;
    options = label;
  }

  let info = name;
  if (label) {
    info = name + ":" + label;
  }
  const contractFactory = await ethers.getContractFactory(name);
  let contract;
  if (options) {
    contract = await contractFactory.deploy(...args, options);
  } else {
    contract = await contractFactory.deploy(...args);
  }
  const argStr = args.map((i) => `"${i}"`).join(" ");
  console.info(`Deploying ${info} ${contract.address} ${argStr}`);
  await contract.deployTransaction.wait();
  console.info("... Completed!");

  let uploadToTenderfly = false;
  try {
    uploadToTenderfly = process.env.UseTenderly == "True";
  } catch (error) {}
  // Check if the deployment is not local and not skipped, and if the UseTenderly environment variable is set to "True"
  if (!isLocalHost() && uploadToTenderfly) {
    // Persist contract artifacts on Tenderly
    await hre.tenderly.persistArtifacts({
      name: name,
      address: contract.address,
    });
    // check  contract on Tenderly
    await hre.tenderly.check({
      name: name,
      address: contract.address,
    });
  }

  return contract;
}

async function deployContractAndReturnReceipt(name, args = [], label, options) {
  if (!options && typeof label === "object") {
    label = null;
    options = label;
  }

  let info = name;
  if (label) {
    info = name + ":" + label;
  }
  const contractFactory = await ethers.getContractFactory(name);
  let contract;
  if (options) {
    contract = await contractFactory.deploy(...args, options);
  } else {
    contract = await contractFactory.deploy(...args);
  }
  const argStr = args.map((i) => `"${i}"`).join(" ");
  console.info(`Deploying ${info} ${contract.address} ${argStr}`);
  const receipt = await contract.deployTransaction.wait();
  console.info("... Completed!");

  let uploadToTenderfly = false;
  try {
    uploadToTenderfly = process.env.UseTenderly == "True";
  } catch (error) {}
  // Check if the deployment is not local and not skipped, and if the UseTenderly environment variable is set to "True"
  if (!isLocalHost() && uploadToTenderfly) {
    // Persist contract artifacts on Tenderly
    await hre.tenderly.persistArtifacts({
      name: name,
      address: contract.address,
    });
    // check  contract on Tenderly
    await hre.tenderly.check({
      name: name,
      address: contract.address,
    });
  }
  return {
    contract,
    receipt,
  };
}

async function readDeployedContract(name, args = [], label, symbol = null) {
  let info = name;
  let existingObj;
  if (symbol == null) existingObj = readContractAddresses();
  else existingObj = readContractAddresses2(symbol);
  if (label) contractAddress = existingObj[label];
  else contractAddress = existingObj[info];
  const contractFactory = await ethers.getContractFactory(name);
  return await contractFactory.attach(contractAddress);
}

async function readUpgradableDeployedContract(
  name,
  args = [],
  label,
  symbol = null
) {
  let info = name;
  let existingObj;
  if (symbol == null) existingObj = readContractAddresses();
  else existingObj = readContractAddresses2(symbol);
  if (label) contractAddress = existingObj[label];
  else contractAddress = existingObj[info];
  const contractFactory = await ethers.getContractFactory(name);
  return await contractFactory.attach(contractAddress);
}

async function readDeployedContract2({
  name,
  args = [],
  label = null,
  symbol = null,
} = {}) {
  return await readDeployedContract(name, args, label, symbol);
}

async function deployWithAddressStorage(name, args = [], label, options) {
  let existingObj = readContractAddresses();
  let isDeployed = false;
  let contractAddress;
  let keyInfo;

  let info = name;

  if (label) {
    info = name + ":" + label;
    keyInfo = label;
    contractAddress = existingObj[label];
    if (contractAddress === undefined) {
      isDeployed = true;
    }
  } else {
    keyInfo = info;
    contractAddress = existingObj[info];
    if (contractAddress === undefined) {
      isDeployed = true;
    }
  }

  const contractFactory = await ethers.getContractFactory(name);
  // console.log("%s not exists, deploying.....", keyInfo)

  let contract;
  if (options) {
    try {
      contract = await contractFactory.deploy(...args, options);
    } catch (error) {
      // console.error("deploy %s failed, error: %s", info, error.message)
      return;
    }
  } else {
    try {
      contract = await contractFactory.deploy(...args);
    } catch (error) {
      console.error("deploy %s failed, error: %s", info, error.message);
      return;
    }
  }
  const argStr = args.map((i) => `"${i}"`).join(" ");
  // console.info(`Deploying ${info} ${contract.address} ${argStr}`)
  // console.info(`Deploying ${info}: ${contract.address} `);
  const receipt = await contract.deployTransaction.wait();
  if (receipt.status === 1) {
    // console.log(
    //   `${keyInfo} deploy success, txHash: %s, gasUsed: %s, total gasUsed: %s`,
    //   receipt.transactionHash,
    //   receipt.gasUsed,
    //   (totalGasUsed += Number(receipt.gasUsed))
    // )
  } else {
    // console.error(`${keyInfo} deploy failed, receipt: %s`, receipt)
  }
  /*
    await hre.tenderly.persistArtifacts({
      name: "Greeter",
      address: greeter.address,
    })
  */

  let obj = {};
  if (label) {
    obj[label] = contract.address;
  } else {
    obj[info] = contract.address;
  }
  writeContractAddresses(obj);

  // console.info("%s... Completed!", keyInfo)
  return contract;
}

async function uploadToTenderfly(name, contract) {
  await hre.tenderly.persistArtifacts({
    name: name,
    address: contract.address,
  });
  // check  contract on Tenderly
  await hre.tenderly.check({
    name: name,
    address: contract.address,
  });
}

async function deployOrConnect(
  name,
  args = [],
  label,
  options,
  shouldLog = true
) {
  let existingObj = readContractAddresses();
  let deployed = true;
  let contractAddress;
  let keyInfo;
  let info = name;

  if (label) {
    info = name + ":" + label;
    keyInfo = label;
    contractAddress = existingObj[label];
    if (contractAddress === undefined) {
      deployed = false;
    }
  } else {
    keyInfo = info;
    contractAddress = existingObj[info];
    if (contractAddress === undefined) {
      deployed = false;
    }
  }

  const contractFactory = await ethers.getContractFactory(name);

  if (!isLocalFlow && deployed) {
    // await hre.tenderly.persistArtifacts({
    //   name: name,
    //   address: contractAddress
    // });
    // // check  contract on Tenderly
    // await hre.tenderly.check ({
    //   name: name,
    //   address: contractAddress,
    // })
    if (shouldLog)
      // console.log("%s already exists, address: %s", keyInfo, contractAddress)
      return await contractFactory.attach(contractAddress);
  }

  if (shouldLog) console.log("%s not exists, deploying.....", keyInfo);

  let contract;
  if (options) {
    try {
      contract = await contractFactory.deploy(...args, options);
    } catch (error) {
      if (shouldLog)
        console.error("deploy %s failed, error: %s", info, error.message);
      process.exit();
      return;
    }
  } else {
    try {
      contract = await contractFactory.deploy(...args);
    } catch (error) {
      if (shouldLog)
        console.error("deploy %s failed, error: %s", info, error.message);
      process.exit();
      return;
    }
  }

  // const argStr = args.map((i) => `"${i}"`).join(" ")
  // console.info(`Deploying ${info} ${contract.address} ${argStr}`);
  const receipt = await contract.deployTransaction.wait();
  if (receipt.status === 1) {
    // deploy success
    // ==============================================
    // ADD TO TENDERLY FOR VERIFICATION AND PERSISTENCE
    // ==============================================
    let uploadToTenderfly = false;
    try {
      uploadToTenderfly = process.env.UseTenderly == "True";
    } catch (error) {}
    // Check if the deployment is not local and not skipped, and if the UseTenderly environment variable is set to "True"
    if (!isLocalHost() && uploadToTenderfly) {
      // Persist contract artifacts on Tenderly
      await hre.tenderly.persistArtifacts({
        name: name,
        address: contract.address,
      });
      // check  contract on Tenderly
      await hre.tenderly.check({
        name: name,
        address: contract.address,
      });
    }
    // ==============================================
    if (shouldLog) {
      console.log(
        // `${keyInfo} deploy success, txHash: %s, gasUsed: %s, total gasUsed: %s`,
        receipt.transactionHash,
        receipt.gasUsed,
        (totalGasUsed += Number(receipt.gasUsed))
      );
    }
  } else {
    // deploy fail
    if (shouldLog)
      console.error(`${keyInfo} deploy failed, receipt: %s`, receipt);
  }

  let obj = {};
  if (label) {
    obj[label + "_block"] = receipt.blockNumber;
  } else {
    obj[info] = contract.address;
    obj[info + "_block"] = receipt.blockNumber;
  }

  writeContractAddresses(obj);

  if (shouldLog)
    console.info("%s... Completed! address: %s", keyInfo, contract.address);
  return contract;
}

async function deployOrConnect2(
  symbol,
  name,
  args = [],
  label,
  options,
  shouldLog = true
) {
  let existingObj = readContractAddresses2(symbol);
  let deployed = true;
  let contractAddress;
  let keyInfo;
  let info = name;

  if (label) {
    info = name + ":" + label;
    keyInfo = label;
    contractAddress = existingObj[label];
    if (contractAddress === undefined) {
      deployed = false;
    }
  } else {
    keyInfo = info;
    contractAddress = existingObj[info];
    if (contractAddress === undefined) {
      deployed = false;
    }
  }

  const contractFactory = await ethers.getContractFactory(name);

  if (!isLocalFlow && deployed) {
    // await hre.tenderly.persistArtifacts({
    //   name: name,
    //   address: contractAddress
    // });
    // // check  contract on Tenderly
    // await hre.tenderly.check ({
    //   name: name,
    //   address: contractAddress,
    // })
    if (shouldLog)
      console.log("%s already exists, address: %s", keyInfo, contractAddress);
    return await contractFactory.attach(contractAddress);
  }

  if (shouldLog) console.log("%s not exists, deploying.....", keyInfo);

  let contract;
  if (options) {
    try {
      contract = await contractFactory.deploy(...args, options);
    } catch (error) {
      if (shouldLog)
        console.error("deploy %s failed, error: %s", info, error.message);
      process.exit();
      return;
    }
  } else {
    try {
      contract = await contractFactory.deploy(...args);
    } catch (error) {
      if (shouldLog)
        console.error("deploy %s failed, error: %s", info, error.message);
      process.exit();
      return;
    }
  }

  // const argStr = args.map((i) => `"${i}"`).join(" ")
  // console.info(`Deploying ${info} ${contract.address} ${argStr}`);
  const receipt = await contract.deployTransaction.wait();
  if (receipt.status === 1) {
    // deploy success
    // ==============================================
    // ADD TO TENDERLY FOR VERIFICATION AND PERSISTENCE
    // ==============================================
    let uploadToTenderfly = false;
    try {
      uploadToTenderfly = process.env.UseTenderly == "True";
    } catch (error) {}
    // Check if the deployment is not local and not skipped, and if the UseTenderly environment variable is set to "True"
    if (!isLocalHost() && uploadToTenderfly) {
      // Persist contract artifacts on Tenderly
      await hre.tenderly.persistArtifacts({
        name: name,
        address: contract.address,
      });
      // check  contract on Tenderly
      await hre.tenderly.check({
        name: name,
        address: contract.address,
      });
    }
    // ==============================================
    if (shouldLog) {
      console.log(
        // `${keyInfo} deploy success, txHash: %s, gasUsed: %s, total gasUsed: %s`,
        receipt.transactionHash,
        receipt.gasUsed,
        (totalGasUsed += Number(receipt.gasUsed))
      );
    }
  } else {
    // deploy fail
    if (shouldLog)
      console.error(`${keyInfo} deploy failed, receipt: %s`, receipt);
  }

  let obj = {};
  if (label) {
    obj[label] = contract.address;
    obj[label + "_block"] = receipt.blockNumber;
  } else {
    obj[info] = contract.address;
    obj[info + "_block"] = receipt.blockNumber;
  }

  writeContractAddresses2(obj, symbol);

  if (shouldLog)
    console.info("%s... Completed! address: %s", keyInfo, contract.address);
  return contract;
}

async function handleTx(txPromise, label) {
  let promiseInfo = label ? label : "contract function";
  let index = 0;
  const RETRY_ATTEPMTS = 1;
  for (index = 0; index < RETRY_ATTEPMTS; index++) {
    try {
      await txPromise.then(
        async (pendingTx) => {
          // console.log(`${promiseInfo} executing, waiting for confirm...`)
          const receipt = await pendingTx.wait();
          if (receipt.status === 1) {
            // console.log(
            //   `${promiseInfo} executing success, txHash: %s, gasUsed: %s, total gasUsed: %s`,
            //   receipt.transactionHash,
            //   receipt.gasUsed,
            //   (totalGasUsed += Number(receipt.gasUsed))
            // )
            index = 100;

            return receipt;
          } else {
            console.error(
              `${promiseInfo} executing failed, receipt: %s`,
              receipt
            );
          }
        },
        (error) => {
          console.error(
            "failed to execute transaction: %s, error: %s",
            promiseInfo,
            error
          );
        }
      );
    } catch (error) {
      console.log(error);
      console.log("retry", index + 1);
    }
  }
}

async function waitTx(txPromise, label) {
  return await txPromise.then(
    async (pendingTx) => {
      //console.log(`${label} executing, waiting for confirm...`)
      const receipt = await pendingTx.wait();
      if (receipt.status === 1) {
        //console.log("receipt", receipt);
        return receipt;
      } else {
        process.exit();
      }
    },
    (error) => {
      //console.error(`failed to execute transaction ${label} , error: ${error}`)
      process.exit();
    }
  );
}

async function contractAt(name, address, provider) {
  let contractFactory = await ethers.getContractFactory(name);
  if (provider) {
    contractFactory = await contractFactory.connect(provider);
  }
  return await contractFactory.attach(address);
}

const contractAddressesFilepath = path.join(
  __dirname,
  "../..",
  `contract-addresses-${network}.json`
);
function getAddress(symbol) {
  const firstThree = symbol.substring(0, 3);
  const tempPath = path.join(
    __dirname,
    "../..",
    `contract-addresses-${network}-${firstThree}.json`
  );
  return tempPath;
}

function readContractAddresses() {
  if (fs.existsSync(contractAddressesFilepath)) {
    return JSON.parse(fs.readFileSync(contractAddressesFilepath));
  }
  return {};
}

function getChainId() {
  const cfg = require("../../hardhat.config.js");
  return cfg.networks[network].chainId;
}

async function fetchContractAddresses() {
  try {
    let chainId = getChainId();
    const response = await axios.get(
      `https://api.blex.io/api/chainservice/getaddress?chainId=${chainId}`
    );
    const data = response.data.data;
    return data;
  } catch (error) {
    console.error("Error occurred while fetching data:", error);
    return null;
  }
}

function readContractAddresses2(symol) {
  const tempPath = getAddress(symol);
  if (fs.existsSync(tempPath)) {
    return JSON.parse(fs.readFileSync(tempPath));
  }
  return {};
}

function writeContractAddresses(json) {
  const tmpAddresses = Object.assign(readContractAddresses(), json);
  fs.writeFileSync(contractAddressesFilepath, JSON.stringify(tmpAddresses));
}

function writeContractAddresses2(json, symbol) {
  const tmpAddresses = Object.assign(readContractAddresses2(symbol), json);
  const contractAddressesFilepath = getAddress(symbol);
  fs.writeFileSync(contractAddressesFilepath, JSON.stringify(tmpAddresses));
}

async function callWithRetries(func, args, retriesCount = 3) {
  let i = 0;
  while (true) {
    i++;
    try {
      return await func(...args);
    } catch (ex) {
      if (i === retriesCount) {
        console.error("call failed %s times. throwing error", retriesCount);
        throw ex;
      }
      console.error("call i=%s failed. retrying....", i);
      console.error(ex.message);
    }
  }
}

// batchLists is an array of lists
async function processBatch(batchLists, batchSize, handler) {
  let currentBatch = [];
  const referenceList = batchLists[0];

  for (let i = 0; i < referenceList.length; i++) {
    const item = [];

    for (let j = 0; j < batchLists.length; j++) {
      const list = batchLists[j];
      item.push(list[i]);
    }

    currentBatch.push(item);

    if (currentBatch.length === batchSize) {
      console.log(
        "handling currentBatch",
        i,
        currentBatch.length,
        referenceList.length
      );
      await handler(currentBatch);
      currentBatch = [];
    }
  }

  if (currentBatch.length > 0) {
    console.log(
      "handling final batch",
      currentBatch.length,
      referenceList.length
    );
    await handler(currentBatch);
  }
}

function copyJsonFiles(sourceFolder, destFolder) {
  // Get a list of files in the source folder
  const files = fs.readdirSync(sourceFolder);
  // Loop through each file
  files.forEach((file) => {
    const filePath = path.join(sourceFolder, file);
    const stats = fs.statSync(filePath);

    // If the file is a directory, recursively call the function
    if (stats.isDirectory()) {
      // console.log(filePath);
      // console.log(path.join(destFolder, file));
      copyJsonFiles(filePath, destFolder);
    } else {
      // If the file is a JSON file, copy it to the destination folder
      if (path.extname(filePath) === ".json" && file.indexOf(".dbg.") == -1) {
        const fileContents = fs.readFileSync(filePath);
        const destPath = path.join(destFolder, file);
        fs.writeFileSync(destPath, fileContents);
      }
    }
  });
}

function copyAbis2() {
  const paths = [
    "../../artifacts/contracts/market/MarketRouter.sol/MarketRouter.json",
    "../../artifacts/contracts/market/MarketReader.sol/MarketReader.json",
    "../../artifacts/contracts/vault/VaultRouter.sol/VaultRouter.json",
    "../../artifacts/contracts/vault/VaultReward.sol/VaultReward.json",
  ];
  for (let index = 0; index < paths.length; index++) {
    const sourceFile = path.join(__dirname, paths[index]);
    const ppp = sourceFile.split("/");
    const fileName = ppp[ppp.length - 1];
    const destFolder = path.join(
      __dirname,
      "./../../../depx-view/src/abis/" + fileName
    );
    console.log(destFolder);
    const fileContents = fs.readFileSync(sourceFile);
    fs.writeFileSync(destFolder, fileContents);
  }
}

function copyAddressJson() {
  const f = `contract-addresses-${network}.json`;
  const file = path.join(__dirname, "../..", f);
  const destFolder = path.join(
    __dirname,
    "./../../../depx-view/src/config/address/"
  );
  const fileContents = fs.readFileSync(file);
  const destPath = path.join(destFolder, f);
  fs.writeFileSync(destPath, fileContents);
}

function copyAddressLocalDev() {
  const f = "contract-addresses-localhost.json";
  const file = path.join(__dirname, "../..", f);
  const destFolder = path.join(
    __dirname,
    "./../../../depx-view/src/config/address/"
  );
  const fileContents = fs.readFileSync(file);
  const destPath = path.join(destFolder, f);
  fs.writeFileSync(destPath, fileContents);
}
async function sendTxn(txnPromise, label) {
  const txn = await txnPromise;
  console.info(`Sending ${label}...`);
  await txn.wait();
  console.info(`... Sent! ${txn.hash}`);
  await sleep(2000);
  return txn;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hasRole(granter, role, grantee) {
  const roleHash = utils.keccak256(utils.toUtf8Bytes(role))
  return await granter.hasRole(roleHash, grantee)
}

async function grantRoleIfNotGranted(
  granter,
  role,
  grantee,
  label,
  private_key = null
) {
  const roleHash = utils.keccak256(utils.toUtf8Bytes(role));

  if (await granter.hasRole(roleHash, grantee)) {
    console.log("granted", label);
    return;
  }
  if (null == private_key)
    await handleTx(granter.grantRole(roleHash, grantee), label);
  else {
    const new_wallet = new ethers.Wallet(private_key, ethers.provider);
    await handleTx(
      granter.connect(new_wallet).grantRole(roleHash, grantee),
      label
    );
  }
}

async function transferAdmin(granter, grantee, label, private_key = null) {
  const defaultAdminHash = ethers.utils.formatBytes32String("");
  // console.log(defaultAdminHash);
  // console.log(await granter.hasRole(defaultAdminHash, grantee));

  if (await granter.hasRole(defaultAdminHash, grantee)) {
    // console.log("return granted", label);
    return;
  }
  if (null == private_key)
    await handleTx(granter.transferAdmin(grantee), label);
  else {
    const new_wallet = new ethers.Wallet(private_key, ethers.provider);
    await handleTx(granter.connect(new_wallet).transferAdmin(grantee), label);
  }
}

async function revokeRoleIfGranted(granter, role, grantee, label) {
  const roleHash = utils.keccak256(utils.toUtf8Bytes(role));

  if (isLocalFlow) {
    return await handleTx(granter.revokeRole(roleHash, grantee), label);
  }

  if (await granter.hasRole(roleHash, grantee)) {
    await handleTx(granter.revokeRole(roleHash, grantee), label);
    console.log("revokeRole", label);
    return;
  }
}

async function _deploy(contractName, ...args) {
  return _deployWithSigner(null, contractName, ...args);
}

async function _deployWithSigner(signer, contractName, ...args) {
  const factory = await _getFactory(contractName);
  let deployed;
  if (signer == null) {
    deployed = await factory.deploy(...args);
  } else {
    deployed = await factory.connect(signer).deploy(...args);
  }
  const receipt = await deployed.deployTransaction.wait();
  return { deployed, receipt };
}

async function _getFactory(name) {
  const contractFactory = await ethers.getContractFactory(name);
  return contractFactory;
}

async function getContractAt(contractName, address) {
  const factory = await _getFactory(contractName);
  return await factory.attach(address);
}

async function deployUpgradeable(
  contractName,
  aliasName,
  admin = "0x7a3FFfef35753943B0f3DD77174570cBe616aA2e"
) {
  // const {
  //   UpgradeAccount,
  // } = require(`../../config/chain/${process.env.HARDHAT_NETWORK}/wallet.json`);
  // admin = UpgradeAccount;
  let implementation = await deployContract(
    contractName,
    [],
    contractName + "__implementation"
  );
  const { deployed, receipt } = await _deploy(
    "TransparentUpgradeableProxy",
    implementation.address,
    admin,
    "0x"
  );
  const deployedContracts = {};
  deployedContracts[aliasName] = {
    type: "upgradeable",
    name: aliasName,
    address: deployed.address,
    dependencies: { admin, implementation: implementation.address },
    deployedAt: receipt.blockNumber,
  };
  //console.log(deployedContracts[aliasName]);
  // const implementation = await getContractAt(contractName, deployed.address)
  return {
    implementation,
    proxy: deployed,
    receipt: receipt,
  };
}

async function upgradeContract(contractName) {
  let implementation = await deployContract(
    contractName,
    [],
    contractName + "__implementation"
  );
  let existingObj = readContractAddresses();
  contractAddress = existingObj[contractName];
  const proxyContract = await getContractAt(
    "TransparentUpgradeableProxy",
    contractAddress
  );
  const upgradeWallet = new ethers.Wallet(
    process.env.TestnetUpgradePrivateKey,
    ethers.provider
  );
  await handleTx(
    proxyContract.connect(upgradeWallet).upgradeTo(implementation.address)
  );
  writeContractAddresses({ [contractName + "Impl"]: implementation.address });
  return {
    implementation,
    proxy: proxyContract,
  };
}

async function getDeployer() {
  const [wallet] = await ethers.getSigners();
  return wallet;
}

function readMarketIds(contractAddressesFilepath) {
  if (fs.existsSync(contractAddressesFilepath)) {
    return JSON.parse(fs.readFileSync(contractAddressesFilepath))
  }
  return {}
}

function getMarketIdBySymbol(symbol) {
  const contractAddressesFilepath = `./config/chain/${process.env.HARDHAT_NETWORK}/marketIds.json`
  
  return readMarketIds(contractAddressesFilepath)[symbol + "/USD"]
}

async function getMarketContract(
  symbol,
  contractName = "Market",
  contractClass = "Market"
) {
  let data = await fetchContractAddresses()
  let marketAddr;
  let marketID
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    if (element.name == "Market") {
      marketAddr = element.address
      const contractFactory = await ethers.getContractFactory("Market")
      const market = await contractFactory.attach(marketAddr)
      if ((await market.name()) == symbol) {
        marketID = element.marketID
        const contractAddressesFilepath = `./config/chain/${process.env.HARDHAT_NETWORK}/marketIds.json`
        const tmpAddresses = Object.assign(readMarketIds(contractAddressesFilepath), {
          [String(marketID)]: symbol,
          [symbol]: marketID
        })
        fs.writeFileSync(contractAddressesFilepath, JSON.stringify(tmpAddresses))
        break
      }
    }
  }

  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    if (element.name == contractName && element.marketID == marketID) {
      const contractFactory = await ethers.getContractFactory(contractClass)
      return await contractFactory.attach(marketAddr)
    }
  }

}


module.exports = {
  upgradeContract,
  deployContract,
  deployOrConnect,
  contractAt,
  writeContractAddresses,
  readContractAddresses,
  callWithRetries,
  processBatch,
  handleTx,
  readDeployedContract,
  writeContractAddresses2,
  copyAbis2,
  copyAddressJson,
  copyAddressLocalDev,
  sendTxn,
  grantRoleIfNotGranted,
  revokeRoleIfGranted,
  deleteAddressJson,
  deployWithAddressStorage,
  uploadToTenderfly,
  waitTx,
  isLocalHost,
  deployOrConnect2,
  readDeployedContract2,
  deployUpgradeable,
  readUpgradableDeployedContract,
  getContractAt,
  deployContractAndReturnReceipt,
  transferAdmin,
  writeContractAddresses2,
  getChainId,
  fetchContractAddresses,
  getDeployer,
  fetchJson,
  hasRole,
  getMarketContract,
  getMarketIdBySymbol,
  fetchDevContractAddresses,
};
