const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildFees,
  buildIncreaseOrderParam,
  buildDecreaseOrderParam,
  buildDecreasePositionParam,
} = require("../../../utils/buildParams");
const {
  validSize,
  validBalanceChange,
  validTransfer,
  validPnl,
  validCollateral,
  validAvgPrice,
  vaildUpdatePositionEvent,
  vaildOrderExist,
  validOrdersDeleted,
} = require("../../../utils/vaildData");
const {
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  calcMarketAmount,
  calcPNL,
  calcCollateral,
  calAveragePrice,
  priceToBigNumber,
  numberToBigNumber,
  calcCloseFee,
  calcSlippagePrice,
  getOrderInfo,
  getSize,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
const {
  vaildPosition,
  vaildDecreaseOrder,
} = require("../../../utils/vaildPosition");
const { balanceOf, mint } = require("../../../../../scripts/mock/erc20");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  increasePosition,
  connectUpdateOrder,
  decreasePosition,
  updateOrder,
  cancelOrderList,
  setIsEnableMarketConvertToOrder,
  connectDecreasePosition,
} = require("../../../../../scripts/market/marketRouter");
const {
  vaildIncreaseOrder,
  vaildOrderCreated,
  vaildUpdateOrderEvent,
  vaildDeleteOrderEvent,
} = require("../../../utils/vaildOrder");
const {
  getAccountOrderNumber,
  ordersIndex,
} = require("../../../../../scripts/order/orderStore");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { BigNumber } = require("ethers");

describe("Cancel all orders (including limit and trigger), 30 orders", async () => {
  let allContracts;
  let owner, second, third;
  beforeEach(async () => {
    allContracts = await readServiceAllMarket();
    [owner, second, third] = await ethers.getSigners();
    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      market: allContracts.market.address,
      indexToken: allContracts.indexToken,
    });
  });

  it("Cancel all orders (including limit and trigger), 30 orders", async () => {
    logger.info(
      "---Cancel all orders (including limit and trigger), 30 orders---"
    );
    //Perform pre-preparation operations, including setting the price of the oracle machine, and mint the corresponding amount of tokens and authorize them to marketRouter;
    await execPrePare({
      user: owner,
      amount: 200,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1700,
    });

    //Used to hold collateral  balances
    let afterCollD;
    const orderIDs = Array(30);
    const limitOrders = new Array(20);
    const triggerOrders = new Array(10);

    //Increase positions for users
    {
      //Build and increase position parameters
      let incParams = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1700,
        pay: 200,
        size: 2000,
      });
      //Get the user's current position before trading
      let beforeSize = await getSize({
        user: owner.address,
        price: 1700,
        isLong: true,
      });
      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 1700,
        isLong: true,
      });
      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        incParams._isLong
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });

      //Get opening fee
      let openFee = calcOpenFee({
        sizeDelta: incParams._sizeDelta,
      });

      //Construct the various fees of this transaction
      let fees = buildFees({
        openFee: openFee,
        fundFee: fundingFee,
      });

      //Sum up the various expenses
      let totalFee = totalFees(fees);
      //Get oracle price

      let oracelPrice = await getPrice(allContracts.indexToken, true);
      //Used to check  the position
      incParams._oraclePrice = oracelPrice;
      // check  the position
      vaildPosition({
        params: incParams,
        position: position,
        fees: fees,
      });

      //Get the user's balance before initiating a transaction
      let beforeAmount = await balanceOf(owner.address);
      //Get the market balance before the transaction is initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Open Position
      let lastTx = await increasePosition(incParams);

      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      //Get the user's balance after completing the transaction
      let afterAmount = await balanceOf(owner.address);
      //Get the user's position after the transaction is completed
      let afterSize = await getSize({
        user: owner.address,
        price: 1700,
        isLong: incParams._isLong,
      });
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

      //Calculate the funds that the market should receive
      let marketAmount = calcMarketAmount({
        amount: incParams.collateralDelta,
        fee: totalFee,
      });
      console.log(
        incParams._sizeDelta,
        afterMarketFundsUsed,
        beforeMarketFundsUsed,
        afterSize
      );
      //Check borrow Size changes
      validBalanceChange(
        incParams._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow size changes"
      );
      //check user balance changes
      validBalanceChange(
        incParams.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check user balance changes"
      );
      //check  market balance changes
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
      );
      //check user position changes
      validBalanceChange(
        incParams._sizeDelta,
        afterSize.sub(beforeSize),
        "check user position changes"
      );

      //Calculate the collD required for the emit event
      let collD = incParams.collateralDelta.sub(totalFee);

      //Build event parameter list
      let eventArgs = [
        owner.address, //account
        incParams.collateralDelta, //collateralDelta
        collD, //collD
        incParams._sizeDelta, //size
        incParams._isLong, //isLong
        oracelPrice, //oraclePrice
        0, //pnl
        fees, //fees []int
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        0, //category Open Position is 0, increase collateral  is 2
        0, //fromOrder
      ];

      //check feeRouter transfer event
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "The feeRouter balance does not correspond to the expected one",
        expandDecimals: false,
      });

      //check  the user balance transferred to the market amount event
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 200,
        label:
          "The amount transferred to the market by the user does not correspond to the expected amount",
      });

      //check  event and corresponding parameters
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });

      //get position
      position = await getCurrentPosition({
        user: owner.address,
        price: 1700,
        isLong: true,
      });
      //Check PNL, because it is the first time to add a position, so PNL should be 0
      //Calculate PNL locally,,

      let result = calcPNL({
        position,
        price: 1700,
      });
      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      await validPnl({
        user: owner.address,
        price: 1700,
        isLong: true,
        pnl: pnl,
      });

      let coll = calcCollateral({
        pay: incParams.collateralDelta,
        fees: totalFee,
      });
      afterCollD = coll;
      //check collateral
      await validCollateral({
        user: owner.address,
        price: 1700,
        isLong: incParams._isLong,
        coll,
      });

      //Check average price
      await validAvgPrice({
        user: owner.address,
        price: 1700,
        isLong: true,
        price0: calAveragePrice({
          position: position,
          sizeDelta: incParams._sizeDelta,
          marketPrice: oracelPrice,
          pnl: 0,
          hasProfit: true,
        }),
      });
    }
    //Add 20 limit orders
    {
      for (let index = 0; index < 20; index++) {
        //Give the user mint a certain amount of tokens, and the user opens a limit order
        await userMintAndApprove(owner, 200, allContracts.marketRouter);
        //Build limit order parameter
        let params = buildIncreaseOrderParam({
          market: allContracts.market.address,
          price: 1700,
          pay: 200,
          size: 2000,
        });

        //Build fees
        let fees = buildFees({
          openFee: calcOpenFee({ sizeDelta: params._order.size }),
          execFee: numberToBigNumber(1),
        });
        let totalFee = totalFees(fees);
        //check add order
        vaildIncreaseOrder({
          params,
          fees: totalFee,
        });

        //Calculate slippage from market input[1]>0
        let triggerPrice = calcSlippagePrice({
          price: params._order.price,
          isLong: true,
          isOpen: true,
          slippage: 30,
        });

        //Get the user's current orderID in the contract
        let beforeOrderId = await ordersIndex(owner.address, "0");
        if (beforeOrderId.eq(0)) {
          beforeOrderId = BigNumber.from(1);
        }
        orderIDs[index] = beforeOrderId;
        limitOrders[index] = beforeOrderId;
        //Build the parameters needed to trigger the UpdateOrder event
        let eventArg = [
          owner.address, //account
          true, //isLong
          true, //isOpen
          beforeOrderId, //orderID
          allContracts.market.address, //market
          params._order.size, //size
          params._order.collateral, //collateral collateral  for this reduction
          triggerPrice, //
          false, //getTriggerAbove()
          0, //Take profit point
          0, //stop loss point
          0, //fromOrder
          true, //whether to keep leverage
        ];
        //send a transaction
        let lastTx = await updateOrder(params);

        //Check event
        await vaildUpdateOrderEvent({
          contract: allContracts.marketRouter,
          tx: lastTx,
          args: [eventArg],
        });
        //Construct the validation parameters of the order
        let vaildOrderArgs = [
          owner.address, //account
          beforeOrderId, //orderID,
          params._order.collateral, //collateral
          params._order.size, //size
          triggerPrice, //price
          params._order.extra1, //tp
          params._order.extra0, //sl
        ];

        let orderInfo = await getOrderInfo({
          user: owner.address,
          orderID: beforeOrderId,
          label: "0",
        });
        //check  that the order exists and check  the corresponding parameters
        vaildOrderCreated({
          order: orderInfo,
          args: vaildOrderArgs,
        });
      }
    }

    //Create 10 Trigger orders
    {
      for (let index = 0; index < 10; index++) {
        //build parameters
        let inputs = buildDecreaseOrderParam({
          market: allContracts.market.address,
          price: 1700,
          size: 10,
        });
        //Get the  user current position
        let position = await getCurrentPosition({
          user: owner.address,
          price: 1700,
          isLong: true,
        });
        //List of fees required to construct this lighten-up
        let fees = buildFees({
          closeFee: calcCloseFee({ sizeDelta: inputs._order.size }),
        });
        let totalFee = totalFees(fees);
        //Get oracle price
        let oraclePrice = await getPrice(allContracts.indexToken, false);

        //Calculate the margin for this time to reduce the position
        let collateralDelta = position.collateral.div(200);
        //Get how many orders the user has placed
        let decrOrderCount = await getAccountOrderNumber(owner.address, "1");
        let beforeOrderId = await ordersIndex(owner.address, "1");
        if (beforeOrderId.eq(0)) {
          beforeOrderId = BigNumber.from(1);
        }
        orderIDs[20 + index] = beforeOrderId;
        triggerOrders[index] = beforeOrderId;

        //check decrease position parameters
        vaildDecreaseOrder({
          collateral: position.collateral,
          collateralDelta: inputs._order.size,
          size: position.size,
          sizeDelta: inputs._order.size,
          fees: totalFee,
          decrOrderCount: decrOrderCount,
        });

        //build parameterslist
        let eventArg = [
          owner.address, //account
          true, //isLong
          false, //isOpen
          beforeOrderId, //orderID
          allContracts.market.address, //market
          inputs._order.size, //size
          collateralDelta, //collateral
          oraclePrice, //price
          false, //getTriggerAbove
          0, //tp
          0, //sl
          0, //fromOrder
          true, //isKeepLev()
          inputs,
        ];

        //send a transaction
        let tx = await connectUpdateOrder(owner, inputs);

        //Construct the validation parameters of the order
        let vaildOrderArgs = [
          owner.address, //account
          beforeOrderId, //orderID,
          collateralDelta, //collateral
          inputs._order.size,
          oraclePrice,
          inputs._order.extra1,
          inputs._order.extra0,
        ];

        //Query whether the order has been inserted
        await vaildOrderExist({
          user: owner.address,
          orderID: beforeOrderId,
          label: "1",
        });

        //check  event parameters
        await vaildUpdateOrderEvent({
          contract: allContracts.marketRouter,
          tx: tx,
          args: [eventArg],
        });
        //Get the order data written into the contract for this transaction
        let orderInfo = await getOrderInfo({
          user: owner.address,
          orderID: beforeOrderId,
          label: "1",
        });
        //check  the data written this time
        vaildOrderCreated({
          order: orderInfo,
          args: vaildOrderArgs,
        });
      }
    }

    //Cancel all trigger orders and limit orders
    {
      const numOrders = 30;
      const firstHalf = Array(20).fill(true);
      const anotherHalf = Array(10).fill(false);
      const isIncreaseList = [...firstHalf, ...anotherHalf];
      const marketArr = Array(numOrders).fill(allContracts.market.address);
      const isLong = Array(numOrders).fill(true);
      //
      let triggerPrice = await getPrice(allContracts.indexToken, true);
      let eventArgs = Array(numOrders);
      let beforeAmount = await balanceOf(owner.address);

      for (let index = 0; index < 20; index++) {
        //Construct the parameter list of cancel event
        let eventArg = [
          owner.address, //account
          true, //isLong
          true, //isOpen
          orderIDs[index], //orderID
          allContracts.market.address, //market
          5, //reason cancel
          triggerPrice, //price
          0, //pnl
        ];

        eventArgs[index] = eventArg;
      }
      for (let index = 0; index < 10; index++) {
        //Construct the parameter list of cancel event
        let eventArg = [
          owner.address, //account
          true, //isLong
          false, //isOpen
          orderIDs[20 + index], //orderID
          allContracts.market.address, //market
          5, //reason cancel
          triggerPrice, //price
          0, //pnl
        ];
        eventArgs[20 + index] = eventArg;
      }
      //send a cancel transaction
      let lastTx = await cancelOrderList(
        marketArr,
        isIncreaseList,
        orderIDs,
        isLong
      );
      //emit event
      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });

      //check  that the order should have been removed
      await validOrdersDeleted({
        user: owner.address,
        orderIDs: limitOrders,
        label: "0",
      });

      await validOrdersDeleted({
        user: owner.address,
        orderIDs: triggerOrders,
        label: "1",
      });
      //Query the deposit that should be refunded when canceling the limit order
      //Calculate how much margin should be refunded if the transaction is executed successfully 200*20
      let afterAmount = await balanceOf(owner.address);
      validBalanceChange(
        numberToBigNumber(200 * 20),
        afterAmount.sub(beforeAmount),
        "check  canceled order refund funds"
      );
    }
  });
});
