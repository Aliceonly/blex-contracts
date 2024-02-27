
const {
    handleTx,
    deployOrConnect
} = require("./utils/helpers")

const Binance = require('node-binance-api')
const network = process.env.HARDHAT_NETWORK || "local-dev"
const addressjson = require(`./../contract-addresses-${network}.json`)

require("dotenv").config();

const apiKey = {
    "zhou": {
        APIKEY: process.env.APIKEY,
        APISECRET: process.env.APISECRET
    }
}

const binanceInstance = new Binance().options(apiKey["zhou"]);

const getPrice = async (symbol) => {
    return await binanceInstance.futuresMarkPrice(`${symbol}USDT`);
};

const setPrice = async (symbol, oracleInstance, price) => {
    const indexTokenAddr = addressjson[symbol];
    await handleTx(
        oracleInstance.setPrice(
            indexTokenAddr,
            ethers.utils.parseUnits(`${price}`, 30)
        )
    );
};

const pollPrice = async (symbol) => {
    let price;
    while (true) {
        try {
            price = await getPrice(symbol);
            break;
        } catch (error) { 
            console.log(error)
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return price["markPrice"];
};

const main = async () => {
    const oracle = await deployOrConnect("MockOracle", []);
    const oracleOld = await deployOrConnect("MockOracle", [], "MockOracle0");
    while (true) {
        const [btcPrice, ethPrice] = await Promise.all([
            pollPrice("BTC"),
            pollPrice("ETH"),
        ]);
        console.log(btcPrice);
        console.log(ethPrice);
        await setPrice("BTC", oracle, btcPrice)
        await setPrice("BTC", oracleOld, btcPrice)
        await setPrice("ETH", oracle, ethPrice)
        await setPrice("ETH", oracleOld, ethPrice)
        await new Promise((resolve) => setTimeout(resolve, 300000));
    }
};

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

