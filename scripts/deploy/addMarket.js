const { Wallet } = require("ethers");
const {
    deployOrConnect2, handleTx, grantRoleIfNotGranted, deployContract,
    isLocalHost
} = require("../utils/helpers");

async function deployMarket({
    deploy = deployOrConnect2,
    marketFactory,
    priceFeed,
    orderMgr,
    positionAddMgr,
    positionSubMgr,
    indexToken,
    feeRouter,
    marketRouter,
    vaultRouter,
    collateralToken,
    globalValid,
    name = 'ETH/USD',
    _minSlippage = 1,
    _maxSlippage = 500,
    _minLeverage = 2,
    _maxLeverage = 200,
    _maxTradeAmount = 100000,
    _minPay = 10,
    _minCollateral = 5,
    _allowOpen = true,
    _allowClose = true,
    _tokenDigits = 18
} = {}) {

    let market
    /* 
    if (isLocalHost()) {
        const marketLogic = await deploy(name, "MarketLogic", [marketFactory.address], "Market")
        market = marketLogic
    } else 
    */
    market = await deploy(name, "Market", [marketFactory.address])

    const positionBook = await deploy(name, "PositionBook", [marketFactory.address])
    const orderBookLong = await deploy(name, "OrderBook", [marketFactory.address], "orderBookLong")
    const orderBookShort = await deploy(name, "OrderBook", [marketFactory.address], "orderBookShort")
    const marketValid = await deploy(name, "MarketValid", [marketFactory.address])

    let osl = []
    for (let index = 0; index < 4; index++) {
        const os = await deploy(name, "OrderStore", [marketFactory.address], "OrderStore" + index)
        osl.push(os)
    }


    const createInputs = {
        _name: name,
        _marketAddress: market.address, // Enter market address here
        addrs: [
            positionBook.address,//0
            orderBookLong.address,//1
            orderBookShort.address,//2
            marketValid.address,//3
            priceFeed.address,//4
            positionSubMgr.address,//5
            positionAddMgr.address,//6
            indexToken,//7
            feeRouter.address,//8
            marketRouter.address,//9
            vaultRouter.address,//10
            collateralToken.address,//11
            globalValid.address,//12
            orderMgr.address//13
        ], // Enter array of addresses here
        _openStoreLong: osl[0].address, // Enter open store long address here
        _closeStoreLong: osl[1].address, // Enter close store long address here
        _openStoreShort: osl[2].address, // Enter open store short address here
        _closeStoreShort: osl[3].address, // Enter close store short address here
        _minSlippage: _minSlippage,
        _maxSlippage: _maxSlippage,
        _minLeverage: _minLeverage,
        _maxLeverage: _maxLeverage,
        _maxTradeAmount: _maxTradeAmount,
        _minPay: _minPay,
        _minCollateral: _minCollateral,
        _allowOpen: _allowOpen,
        _allowClose: _allowClose,
        _tokenDigits: _tokenDigits
    };

    console.log(createInputs);

    const [wallet, user0, user1] = await ethers.getSigners();
    console.log(marketFactory.address);
    console.log(wallet.address);
    
    await grantRoleIfNotGranted(vaultRouter, "VAULT_MGR_ROLE", marketRouter.address, "feeRouter.grant.market")
    await handleTx(marketFactory.create(createInputs), "marFac.create")
    
    await grantRoleIfNotGranted(feeRouter, "ROLE_CONTROLLER", market.address, "feeRouter.grant.market")
    
    
    return {
        market: market,
        positionBook: positionBook,
        orderBookLong: orderBookLong,
        orderBookShort: orderBookShort,
        marketValid: marketValid,
        osl: osl
    }
}

module.exports = {
    deployMarket
};


