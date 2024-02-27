const {
	deployOrConnect,
	readDeployedContract,
	writeContractAddresses,
} = require("../utils/helpers");



async function deployPositionStore(factoryAddr, isLong,writeJson) {
	const ps = await deployOrConnect("PositionStore", [factoryAddr,isLong]);

	const result = {
		PositionStore: ps.address,
	};
	if (writeJson)
		writeContractAddresses(result)
	return ps;
}

async function readPositionStoreContract(isLong) {
   return await readDeployedContract("PositionStore",isLong);
}

async function setPositionBook(pb,isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.setPositionBook(pb)
}

async function getPositionBookAddress(isLong){
    const ps = await readPositionStoreContract(isLong);
    return await  ps.positionBook()
}

async function setPosition(account,position,globalPosition,isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.set(account,position,globalPosition)
}

async function removePosition(account,globalPosition,isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.remove(account,globalPosition)
}

async function globalSize(isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.globalSize()
}
async function getGlobalPosition(isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.getGlobalPosition()
}

async function getAccountPosition(account,isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.get(account)
}

async function contains(account,isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.contains(account)
}

async function getPositionCount(isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.getPositionCount()
}

async function getPositionKeys(start,end,isLong){
    const ps = await readPositionStoreContract(isLong);
    return await ps.getPositionKeys(start,end)
}

module.exports={
    deployPositionStore,
    readPositionStoreContract,
    setPositionBook,
    setPosition,
    removePosition,
    globalSize,
    getGlobalPosition,
    getAccountPosition,
    contains,
    getPositionCount,
    getPositionKeys,
    getPositionBookAddress
}

