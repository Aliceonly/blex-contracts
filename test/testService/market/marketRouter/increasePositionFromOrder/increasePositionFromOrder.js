const { ethers } = require("hardhat");
const {
  userMintAndApprove,
  execCancelOrderAndLiqPosition,
  readServiceAllMarket,
} = require("../../../deploy/deployAllContract");
const {
  connectIncreasePosition,
  setIsEnableMarketConvertToOrder,
} = require("../../../../../scripts/market/marketRouter");
const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");

const { expect } = require("chai");
const {
  validBalanceChange,
  validTransfer,
  validSize,
  validCollateral,
  validAvgPrice,
} = require("../../../utils/vaildData");
const {
  buildIncreasePositionParam,
  buildFees,
} = require("../../../utils/buildParams");
const {
  priceToBigNumber,
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  getOrderInfo,
  numberToBigNumber,
  calcCollateral,
  calAveragePrice,
  calcMarketAmount,
  getFundFee,
  calcSlippagePrice,
  calcPNL,
  calcAUM,
} = require("../../../utils/utils");
const { vaildPosition } = require("../../../utils/vaildPosition");
const {
  vaildOrderCreated,
  vaildDeleteOrderEvent,
  vaildUpdateOrderEvent,
} = require("../../../utils/vaildOrder");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  deployAutoOrderMock,
  checkIndexAutoOrderMock,
  performIndexAutoOrderMock,
} = require("../../../../../scripts/am/autoOrderMock");
const {
  grantRoleIfNotGranted,
} = require("../../../../../scripts/utils/helpers");
const {
  getFundingRates,
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const { ordersIndex } = require("../../../../../scripts/order/orderStore");
const { getFundingFee } = require("../../../utils/fundingFee");
const { BigNumber } = require("ethers");
const fs = require("fs");

const winston = require("winston");

const { logger } = require("../../../utils/utils");

describe("Execute limit buy order testing on a long market instance", async () => {
  let allContracts;
  let owner, second, third;

  beforeEach(async () => {
    allContracts = await readServiceAllMarket();
    [owner, second, third] = await ethers.getSigners();
    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      market: allContracts.market.address,
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      indexToken: allContracts.indexToken,
    });
  });

  it("Execute limit buy order testing on a long market instance", async () => {
    logger.info(
      "---Execute limit buy order testing on a long market instance start---"
    );
    //Set the oracle price
    await setIsEnableMarketConvertToOrder(true);
    await setPrice(allContracts.indexToken, 900);
    await userMintAndApprove(owner, 20, allContracts.marketRouter);
    let inputs = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 900,
      tp: 1300,
      sl: 800,
      pay: 20,
      size: 200,
      isLong: true,
    });
    let orderID = await ordersIndex(owner.address, "0");
    if (orderID.eq(0)) {
      orderID = BigNumber.from(1);
    }
    {
      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      let openFee = calcOpenFee({
        sizeDelta: inputs._sizeDelta,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        true
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });

      let fees = buildFees({
        openFee,
        fundFee: fundingFee,
        execFee: numberToBigNumber(1),
      });

      //Add up various expenses
      let totalFee = totalFees(fees);
      inputs._oraclePrice = oracelPrice;
      // check  the position
      vaildPosition({
        params: inputs,
        position,
        fees,
      });
      let triggerPrice = calcSlippagePrice({
        price: inputs._price,
        isLong: true,
        isOpen: true,
        slippage: 30,
      });
      let beforeAmount = await balanceOf(owner.address);

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //send a transaction
      let lastTx = await connectIncreasePosition(owner, inputs);
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      let afterAmount = await balanceOf(owner.address);

      //check market market balance changes
      validBalanceChange(
        inputs.collateralDelta,
        afterMarketAmount.sub(beforeMarketAmount),
        "check market market balance changes"
      );
      //check  user balance changes
      validBalanceChange(
        inputs.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

      let orderInfo = await getOrderInfo({
        user: owner.address,
        orderID,
        label: "0",
      });

      let orderArgs = [
        owner.address, //account
        orderID, //orderID,
        inputs.collateralDelta, // collateral
        inputs._sizeDelta, // size
        triggerPrice, // price+sliple
        inputs.inputs[0],
        inputs.inputs[1],
      ];

      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 20,
        label: "check  the amount transferred by the user to the market",
      });
      // //build event parameter list
      let eventArg = [
        owner.address, // account
        true, //isLong
        true, // isOpen
        orderID, //orderID
        allContracts.market.address, // market
        inputs._sizeDelta, // size
        inputs.collateralDelta, //collateral
        triggerPrice, // price+sliple
        false, //getTriggerAbove
        inputs.inputs[0],
        inputs.inputs[1],
        0,
        true,
      ];

      vaildOrderCreated({
        order: orderInfo,
        args: orderArgs,
      });

      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [eventArg],
      });
    }

    //Set the oracle price
    await setPrice(allContracts.indexToken, 800);

    {
      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });
      //Get market balances before trading
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        true
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });
      let startOrderID = await ordersIndex(owner.address, "1");
      if (startOrderID.eq(0)) {
        startOrderID = BigNumber.from(1);
      }
      let execOrders = await checkIndexAutoOrderMock(0, 100, true, true);
      expect(execOrders.length, "Get order quantity does not match").to.equal(
        1
      );
      //Build fees
      let fees = buildFees({
        openFee: calcOpenFee({ sizeDelta: execOrders[0].size }),
        execFee: numberToBigNumber(1),
        fundFee: fundingFee,
      });

      let totalFee = totalFees(fees);
      //execute order
      let lastTx = await performIndexAutoOrderMock(0, 100, true, true);

      //Get the market balance after the transaction is completed
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //Successful order execution needs to check  feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });

      let delEventArg = [
        owner.address, //account
        true, //isLong
        true, //isOpen
        orderID, //order
        allContracts.market.address, //market
        3, //delete reason: exec is executed
        priceToBigNumber(800), //triggerAbove
        0, //pnl
      ];


      let updateEventTpArg = [
        owner.address, // account
        true, //isLong
        false, // isOpen
        startOrderID, //orderID
        allContracts.market.address, // market
        inputs._sizeDelta, // size
        0, //collateral
        inputs.inputs[0], // price+sliple
        true, //getTriggerAbove
        0, //tp
        0, //sl
        orderID, //fromOrder
        false, //isKeepLev
      ];

      let updateEventSlArg = [
        owner.address, // account
        true, //isLong
        false, // isOpen
        startOrderID.add(1), //orderID
        allContracts.market.address, // market
        inputs._sizeDelta, // size
        0, //collateral
        inputs.inputs[1], // price+sliple
        false, //getTriggerAbove
        0, //tp
        0, //sl
        orderID, //fromOrder
        false, //isKeepLev
      ];
      let updateEventArg = [updateEventTpArg, updateEventSlArg];

      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [delEventArg],
      });

      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: updateEventArg,
      });

      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 200,
      });
      let coll = numberToBigNumber(20);
      await validCollateral({
        user: owner.address,
        price: 0,
        isLong: true,
        coll: calcCollateral({
          pay: coll,
          fees: totalFee,
        }),
      });

      //Check user average price
      await validAvgPrice({
        user: owner.address,
        price: 0,
        isLong: true,
        price0: calAveragePrice({
          position: position,
          sizeDelta: execOrders[0].size,
          marketPrice: priceToBigNumber(800),
          pnl: 0,
          hasProfit: true,
        }),
      });

      validBalanceChange(
        totalFee,
        beforeMarketAmount.sub(afterMarketAmount),
        "check  market balance changes"
      );

      let orderinfoTp = await getOrderInfo({
        user: owner.address,
        orderID: startOrderID,
        label: "1",
      });
      let orderArgsTp = [
        owner.address, //
        startOrderID,
        0, //
        inputs._sizeDelta,
        inputs.inputs[0],
        0,
        orderID, //close  from Order
      ];

      vaildOrderCreated({
        order: orderinfoTp,
        args: orderArgsTp,
      });
      let orderinfoSl = await getOrderInfo({
        user: owner.address,
        orderID: startOrderID.add(1),
        label: "1",
      });

      let orderArgsSl = [
        owner.address, //
        startOrderID.add(1),
        0, //
        inputs._sizeDelta,
        inputs.inputs[1],
        0,
        orderID, //close  from Order
      ];
      vaildOrderCreated({
        order: orderinfoSl,
        args: orderArgsSl,
      });
    }
  });
});
