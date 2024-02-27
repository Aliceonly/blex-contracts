
const { deployMarketFactory } = require("../market/marketFactory.js");
const {deployPositionBook}=require("./positionBook.js")


async function deployFactory(){
	return await  deployMarketFactory()
}

async function deployPositionBooks(factoryAddr){
    return await deployPositionBook(factoryAddr)
}

