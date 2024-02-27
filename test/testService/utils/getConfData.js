// import data from '../../../conf.json';

const { ethers } = require("hardhat");
const dataConf = require("../../../conf.json");
const {
  getMarketFactoryContract,
} = require("../../../scripts/market/marketFactory");

async function getMarketConfig({ marketAddr }) {
  let configData = await getMarketFactoryContract(marketAddr);
  return {
    name: configData.name,
    addr: configData.addr,
    addrs: configData.inputs.addrs,
    openStoreLong: configData.inputs._openStoreLong,
    closeStoreLong: configData.inputs._closeStoreLong,
    openStoreShort: configData.inputs._openStoreShort,
    closeStoreShort: configData.inputs._closeStoreShort,
    minSlippage: configData.inputs._minSlippage,
    maxSlippage: configData.inputs._maxSlippage,
    minLeverage: configData.inputs._minLeverage,
    maxLeverage: configData.inputs._maxLeverage,
    maxTradeAmount: configData.inputs._maxTradeAmount,
    minPay: configData.inputs._minPay,
    minCollateral: configData.inputs._minCollateral,
    allowOpen: configData.inputs._allowOpen,
    allowClose: configData.inputs._allowClose,
    tokenDigits: configData.inputs._tokenDigits,
  };
}

// function getAllowOpen() {
//   return data["allowOpen"];
// }

// async function getAllowOpen(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["allowOpen"];
//   }
//   return data.allowOpen;
// }

// async function getAllowClose(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["allowClose"];
//   }
//   return data.allowClose;
// }

// async function getMinSlippage(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["minSlippage"];
//   }
//   return data.minSlippage;
// }

// async function getMaxSlippage(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["maxSlippage"];
//   }
//   return data.maxSlippage;
// }

// async function getMaxLev(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["maxLeverage"];
//   }
//   return data.maxLeverage;
// }

// async function getMinLev(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["minLeverage"];
//   }
//   return data.minLeverage;
// }

// async function getMinPay(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["minPay"];
//   }
//   return data.minPay;
// }

// async function getMinCollateral(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["minCollateral"];
//   }
//   return data.minCollateral;
// }

// async function getMaxTradeAmount(marketAddr) {
//   let data = await getMarketConfig(marketAddr);
//   if (data == null) {
//     return dataConf["maxTradeAmount"];
//   }
//   return data.maxTradeAmount;
// }
// 100000000000000000000000

function getAllowOpen() {
  return dataConf["allowOpen"];
}

function getAllowClose() {
  return dataConf["allowOpen"];
}

function getMinSlippage() {
  return dataConf["minSlippage"];
}

function getMaxSlippage() {
  return dataConf["maxSlippage"];
}

function getMaxLev() {
  return dataConf["maxLeverage"];
}

function getMinLev() {
  return dataConf["minLeverage"];
}

function getMinPay() {
  return ethers.utils.parseUnits(dataConf["minPay"] + "", 18);
  return dataConf["minPay"];
}

function getMinCollateral() {
  return ethers.utils.parseUnits(dataConf["minCollateral"] + "", 18);
  return dataConf["minCollateral"];
}

function getMaxTradeAmount() {
  // console.log(ethers.utils.parseUnits(data['maxTradeAmount']+'',getCollateralTokenDecimal())  )
  return ethers.utils.parseUnits(dataConf["maxTradeAmount"] + "", 18);
}

module.exports = {
  getAllowClose,
  getAllowOpen,
  getMaxLev,
  getMinLev,
  getMinPay,
  getMinCollateral,
  getMinSlippage,
  getMaxSlippage,
  getMaxTradeAmount,
  getMarketConfig,
};
