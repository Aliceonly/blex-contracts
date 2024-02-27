const { 
	deployOrConnect, 
	readDeployedContract, 
	handleTx,
	writeContractAddresses,
} = require("../utils/helpers");

async function deployMockGmxPrice(writeJson) {
	const mockPrice = await deployOrConnect("MockGmxPrice", []);

	const result = {
		MockGmxPrice: mockPrice.address
	};
	if (writeJson)
		writeContractAddresses(result)

	return mockPrice;
}

async function readMockMockGmxPrice() {
	const mockPrice = await readDeployedContract("MockGmxPrice");
	return mockPrice
}


async function mockGmxSetPrice(token,price){
    const mockPrice=await readMockMockGmxPrice();
    return await mockPrice.setPrice(token,price);
}


async function mockGmxGetPrice(token){
    const mockPrice=await readMockMockGmxPrice();

    return await mockPrice.prices(token);
}





module.exports = {
    deployMockGmxPrice,
    readMockMockGmxPrice,
    mockGmxSetPrice,
    mockGmxGetPrice,
};
