const { assert } = require("chai");
const {
  handleTx,
  deployOrConnect,
  writeContractAddresses,
  readDeployedContract,
  grantRoleIfNotGranted,
  contractAt,
} = require("./utils/helpers");

async function deployAutoOrder(
  marketName,
  marketAddr,
  isIncrease,
  isLong,
  writeJson
) {
  let label = marketName;
  label = isIncrease ? label + "Open" : label + "Close";
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoOrder" + label;

  const autoOrder = await deployOrConnect(
    "AutoOrder",
    [marketAddr, isIncrease, isLong],
    key
  );

  const result = {
    [key]: autoOrder.address,
  };
  if (writeJson) writeContractAddresses(result);

  return autoOrder;
}

async function deployAutoLiquidate(marketName, marketAddr, isLong, writeJson) {
  let label = marketName;
  label = isLong ? label + "Long" : label + "Short";
  const key = "AutoLiquidate" + label;

  const autoLiq = await deployOrConnect(
    "AutoLiquidate",
    [marketAddr, isLong],
    key
  );

  const result = {
    [key]: autoLiq.address,
  };
  if (writeJson) writeContractAddresses(result);

  return autoLiq;
}

async function addAutoMation(id, registry, minAdd) {
  const autoManager = await readDeployedContract("AutoManager");

  await handleTx(
    autoManager.addAutoMation(id, registry, minAdd),
    "autoManager.addAutoMation"
  );
}

async function deployAutoManager(linkToken, writeJson) {
  const autoManager = await deployOrConnect("AutoManager", [linkToken]);

  const result = {
    AutoManager: autoManager.address,
  };
  if (writeJson) writeContractAddresses(result);

  return autoManager;
}

async function deployAutoPrice(name, linkToken, APIOracle, fee, writeJson, fastPriceFeed, token, url, path) {
  const key = "AutoPrice" + name;

  const autoPrice = await deployOrConnect(
    "AutoPrice",
    [linkToken, APIOracle, fee],
    key
  );

  const result = {
    [key]: autoPrice.address,
  };
  if (writeJson) writeContractAddresses(result);

  await handleTx(
    autoPrice.setFastPriceFeed(fastPriceFeed),
    "autoPrice.setFastPriceFeed"
  )

  await handleTx(
    autoPrice.setToken(token, url, path),
    "autoPrice.setToken"
  )

  return autoPrice;
}

async function deployALL(name, marketAddr, writeJson) {
  const isIncrease = [true, false];
  const isLong = [true, false];

  for (i = 0; i < isLong.length; i++) {
    for (j = 0; j < isIncrease.length; j++) {
      await deployAutoOrder(
        name,
        marketAddr,
        isIncrease[j],
        isLong[i],
        writeJson
      );
    }
    await deployAutoLiquidate(name, marketAddr, isLong[i], writeJson);
  }
}

async function setALLMarket(name, marketAddr, writeJson) {
  const isIncrease = [true, false];
  const isLong = [true, false];
  let autoOrder, autoLiq;
  const market = await contractAt("Market", marketAddr);

  for (i = 0; i < isLong.length; i++) {
    for (j = 0; j < isIncrease.length; j++) {
      autoOrder = await deployAutoOrder(
        name,
        marketAddr,
        isIncrease[j],
        isLong[i],
        writeJson
      );

      await handleTx(autoOrder.setMarket(marketAddr), "autoOrder.setMarket");
      await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", autoOrder.address, "grante.role_pos_keeper.autoOrder");
    }
    autoLiq = await deployAutoLiquidate(name, marketAddr, isLong[i], writeJson);
    await handleTx(autoLiq.setMarket(marketAddr), "autoLiquidate.setMarket");
    await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", autoLiq.address, "grante.role_pos_keeper.autoLiq");
  }
}

async function main() {
  const linkToken = "0xfaFedb041c0DD4fA2Dc0d87a6B0979Ee6FA7af5F";



















  //
  await deployAutoManager(linkToken, true);

  let ids = [
    "70525925578765178164549719973063771396689727086289145294464819304672523144817",
    "93425738457293412416506449837817631710537583132481742909843118579524408053509",
    "12125770179621422424966246859361248756271578938871421759632409486615273955239",
    "3951758148280281119350743810297116599624109846412753554139226851658769523666",
    "108775699251625717907315038162469264150921800627131949268397697867312519700509",
    "5771543385549004226383081532796786241567591858409220215372719664909315820486",
  ];
  const registry = "0xE16Df59B887e3Caa439E0b29B42bA2e7976FD8b2";
  const minAdd = "2000000000000000000";

  for (i = 0; i < ids.length; i++) {
    await addAutoMation(ids[i], registry, minAdd);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
