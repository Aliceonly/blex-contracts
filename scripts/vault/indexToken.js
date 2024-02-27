const { fetchContractAddresses } = require("../utils/helpers");

async function readIndexTokenAddressFromAPI(symbol) {
  const datas = await fetchContractAddresses();

  for (let index = 0; index < datas.length; index++) {
    const element = datas[index];
    if (element.name == symbol) {
      return element.address;
    }
  }
}

module.exports = {
  readIndexTokenAddressFromAPI,
};
