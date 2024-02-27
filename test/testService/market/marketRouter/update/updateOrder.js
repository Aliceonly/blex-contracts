const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreaseOrderParam,
  buildFees,
  buildIncreasePositionParam,
  buildDecreaseOrderParam,
} = require("../../../utils/buildParams");
const {
  connectUpdateOrder,
  cancelOrderList,
  updateOrder,
  increasePosition,
} = require("../../../../../scripts/market/marketRouter");
const {
  calcSlippagePrice,
  calcOpenFee,
  numberToBigNumber,
  totalFees,
  getOrderInfo,
  getCurrentPosition,
  priceToBigNumber,
  calcCloseFee,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  vaildIncreaseOrder,
  vaildUpdateOrderEvent,
  vaildOrderCreated,
  vaildDeleteOrderEvent,
} = require("../../../utils/vaildOrder");
const {
  vaildOrderExist,
  validTransfer,
  validBalanceChange,
  validOrderDeleted,
} = require("../../../utils/vaildData");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");
const {
  checkIndexAutoLiqMock,
} = require("../../../../../scripts/am/autoLiqMock");
const {
  checkIndexAutoOrderMock,
  performIndexAutoOrderMock,
  deployAutoOrderMock,
} = require("../../../../../scripts/am/autoOrderMock");
const { expect } = require("chai");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  grantRoleIfNotGranted,
} = require("../../../../../scripts/utils/helpers");
const { getDecreaseDeltaCollateral } = require("../../../utils/vaildPosition");
const { BigNumber } = require("ethers");
const { ordersIndex } = require("../../../../../scripts/order/orderStore");

describe("UpdateOrder", async () => {
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

  it("After deleting the order, you should receive a pay refund", async () => {
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    logger.info(
      "---After the test deletes the order, the user should receive a pay refund---"
    );
    await execPrePare({
      user: owner,
      amount: 20,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1100,
    });

    //Build pending order parameters
    let params = buildIncreaseOrderParam({
      market: allContracts.market.address,
      price: 1100,
      pay: 20,
      tp: 1300,
      sl: 900,
    });
    let orderID = await ordersIndex(owner.address, "0");
    if (orderID.eq(0)) {
      orderID = BigNumber.from(1);
    }
    //add limit order
    {
      //Calculate the price after including slippage
      let triggerPrice = calcSlippagePrice({
        price: params._order.price,
        isLong: params._isLong,
        isOpen: params.isCreate,
        slippage: 30,
      });

      let fees = buildFees({
        openFee: calcOpenFee({ sizeDelta: params._order.size }),
        execFee: numberToBigNumber(1),
      });
      //Accumulate each cost
      let totalFee = totalFees(fees);
      //check
      vaildIncreaseOrder({
        params: params,
        fees: totalFee,
      });
      //build the parameter list for check the order
      let args = [
        owner.address, //account,
        orderID, //orderID,
        params._order.collateral, //collateral
        params._order.size, //size
        triggerPrice, //price
        params._order.extra1, //tp
        params._order.extra0, //sl
      ];

      //build UpdateOrderEvent params
      let updateEventArgs = [
        owner.address, //account
        true, //isLong
        true, //isIncrease
        orderID, //orderId,
        allContracts.market.address, // market
        params._order.size, //size
        params._order.collateral, //collateral
        triggerPrice, //triggerPrice
        false,
        params._order.extra1, //tp
        params._order.extra0, //sl
        0,
        true,
      ];

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      let lastTx = await connectUpdateOrder(owner, params);

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

      validBalanceChange(
        params._order.collateral,
        afterMarketAmount.sub(beforeMarketAmount),
        "check   order  collateral amount "
      );

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [updateEventArgs],
      });
      await vaildOrderExist({
        user: owner.address,
        orderID,
        label: "0",
      });

      //Whether check order is written to orderStore and check parameters
      let order = await getOrderInfo({
        user: owner.address,
        orderID,
        label: "0",
      });

      //check parameters
      vaildOrderCreated({
        order,
        args,
      });

      //check  the amount of the user's pending order
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 20,
        label: "check  the amount of the user's pending order",
      });
    }

    //Set the oracle price
    await setPrice(allContracts.indexToken, 800);
    //execute order
    {
      //Get market balances before trading
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //send a transaction
      let lastTx = await cancelOrderList(
        [allContracts.market.address],
        [true],
        [orderID],
        [true]
      );

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
      expect(params.collateral, beforeMarketAmount.sub(afterMarketAmount));
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      let delEventArg = [
        owner.address, //account
        true, //isLong
        true, //isOpen
        orderID, //order
        allContracts.market.address, //market
        5, //delete reason: exec
        priceToBigNumber(800), //triggerAbove
        0, //pnl
      ];

      await validOrderDeleted({
        user: owner.address,
        orderID,
        label: "0",
      });

      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: owner.address,
        amount: 20,
        label: "The check market returns funds to the user",
      });

      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [delEventArg],
      });
    }
  });

  it("Delete an Open Position order", async () => {
    logger.info("--- Test Delete an Open Position order---");
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 20,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1100,
    });
    //Build pending order parameters
    let params = buildIncreaseOrderParam({
      market: allContracts.market.address,
      price: 1100,
      pay: 20,
      tp: 1300,
      sl: 900,
    });
    let orderID = await ordersIndex(owner.address, "0");
    if (orderID.eq(0)) {
      orderID = BigNumber.from(0);
    }

    //Put a long order of 1100 (only when the oracle price is greater than 1100, it will be executed)
    {
      //Calculate the price after including slippage
      let triggerPrice = calcSlippagePrice({
        price: params._order.price,
        isLong: params._isLong,
        isOpen: params.isCreate,
        slippage: 30,
      });

      //The cost of constructing this transaction before sending a transaction
      let fees = buildFees({
        openFee: calcOpenFee({ sizeDelta: params._order.size }),
        execFee: numberToBigNumber(1),
      });
      //Accumulate each cost
      let totalFee = totalFees(fees);
      //check
      vaildIncreaseOrder({
        params: params,
        fees: totalFee,
      });
      //build the parameter list for check the order
      let args = [
        owner.address, //account,
        orderID, //orderID,
        params._order.collateral, //collateral
        params._order.size, //size
        triggerPrice, //price
        params._order.extra1, //tp
        params._order.extra0, //sl
      ];

      //build UpdateOrderEvent params
      let updateEventArgs = [
        owner.address, //account
        true, //isLong
        true, //isIncrease
        orderID, //orderId,
        allContracts.market.address, // market
        params._order.size, //size
        params._order.collateral, //collateral
        triggerPrice, //triggerPrice
        false,
        params._order.extra1, //tp
        params._order.extra0, //sl
        0,
        true,
      ];

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      let lastTx = await connectUpdateOrder(owner, params);

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

      validBalanceChange(
        params._order.collateral,
        afterMarketAmount.sub(beforeMarketAmount),
        "check   order  collateral amount "
      );

      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [updateEventArgs],
      });
      await vaildOrderExist({
        user: owner.address,
        orderID,
        label: "0",
      });

      //Whether check order is written to orderStore and check parameters
      let order = await getOrderInfo({
        user: owner.address,
        orderID,
        label: "0",
      });

      //check parameters
      vaildOrderCreated({
        order,
        args,
      });

      //check  the amount of the user's pending order
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 20,
        label: "check  the amount of the user's pending order",
      });
    }

    //Set the oracle price
    await setPrice(allContracts.indexToken, 800);
    //execute order

    {
      //Get market balances before trading
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get the order to execute
      let execOrders = await checkIndexAutoOrderMock(0, 100, true, true);
      //Check whether the order that is expected to be executed and the order that can be executed when the conditions are met can correspond
      expect(execOrders.length, "Get order quantity does not match").to.equal(
        1
      );
      //Build fees
      let fees = buildFees({
        openFee: calcOpenFee({ sizeDelta: execOrders[0].size }),
        execFee: numberToBigNumber(1),
      });

      let totalFee = totalFees(fees);

      let lastTx = await cancelOrderList(
        [allContracts.market.address],
        [true],
        [orderID],
        [true]
      );

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
      expect(params.collateral, beforeMarketAmount.sub(afterMarketAmount));
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      let delEventArg = [
        owner.address, //account
        true, //isLong
        true, //isOpen
        orderID, //order
        allContracts.market.address, //market
        5, //delete reason: exec is executed
        priceToBigNumber(800), //triggerAbove
        0, //pnl
      ];

      await validOrderDeleted({
        user: owner.address,
        orderID,
        label: "0",
      });

      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: owner.address,
        amount: 20,
        label: "check returns funds to user",
      });

      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [delEventArg],
      });
    }
  });

  it("Delete Open Positions with multiple ids at the same time", async () => {
    logger.info(
      "---Delete Open Positions with multiple ids at the same time---"
    );
    await setPrice(allContracts.indexToken, 1100);
    //Put a long order of 1100 (only when the oracle price is greater than 1100, it will be executed)
    let params = buildIncreaseOrderParam({
      market: allContracts.market.address,
      price: 1100,
      pay: 20,
      tp: 1300,
      sl: 900,
    });

    let tmpOrderID = await ordersIndex(owner.address, "0");
    if (tmpOrderID.eq(0)) {
      tmpOrderID = BigNumber.from(0);
    }

    for (let index = 0; index < 4; index++) {
      {
        await userMintAndApprove(owner, 20, allContracts.marketRouter);

        let orderID = await ordersIndex(owner.address, "0");
        if (orderID.eq(0)) {
          orderID = BigNumber.from(0);
        }

        //Calculate the price after including slippage
        let triggerPrice = calcSlippagePrice({
          price: params._order.price,
          isLong: params._isLong,
          isOpen: params.isCreate,
          slippage: 30,
        });

        //The cost of constructing this transaction before sending a transaction
        let fees = buildFees({
          openFee: calcOpenFee({ sizeDelta: params._order.size }),
          execFee: numberToBigNumber(1),
        });
        //Accumulate each cost
        let totalFee = totalFees(fees);
        //check
        vaildIncreaseOrder({
          params: params,
          fees: totalFee,
        });
        //build the parameter list for check the order
        let args = [
          owner.address, //account,
          orderID, //orderID,
          params._order.collateral, //collateral
          params._order.size, //size
          triggerPrice, //price
          params._order.extra1, //tp
          params._order.extra0, //sl
        ];

        //build UpdateOrderEvent params
        let updateEventArgs = [
          owner.address, //account
          true, //isLong
          true, //isIncrease
          orderID, //orderId,
          allContracts.market.address, // market
          params._order.size, //size
          params._order.collateral, //collateral
          triggerPrice, //triggerPrice
          false,
          params._order.extra1, //tp
          params._order.extra0, //sl
          0,
          true,
        ];

        let beforeMarketAmount = await balanceOf(allContracts.market.address);
        let beforeAum = await getAUM();
        let beforeUSD = await getUSDBalance();
        let beforePNL = await getGlobalPnl();

        let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

        let lastTx = await connectUpdateOrder(owner, params);

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

        validBalanceChange(
          params._order.collateral,
          afterMarketAmount.sub(beforeMarketAmount),
          "check   order  collateral amount "
        );

        await vaildUpdateOrderEvent({
          contract: allContracts.marketRouter,
          tx: lastTx,
          args: [updateEventArgs],
        });
        await vaildOrderExist({
          user: owner.address,
          orderID,
          label: "0",
        });

        //Whether check order is written to orderStore and check parameters
        let order = await getOrderInfo({
          user: owner.address,
          orderID,
          label: "0",
        });

        //check parameters
        vaildOrderCreated({
          order,
          args,
        });

        //check  the amount of the user's pending order
        await validTransfer({
          tokenContract: allContracts.USDC,
          blockNumber: lastTx.blockNumber,
          from: owner.address,
          to: allContracts.market.address,
          amount: 20,
          label: "check  the amount of the user's pending order",
        });
      }
    }

    for (let index = 0; index < 4; index++) {
      {
        //Get market balances before trading
        let beforeMarketAmount = await balanceOf(allContracts.market.address);
        let beforeAum = await getAUM();
        let beforeUSD = await getUSDBalance();
        let beforePNL = await getGlobalPnl();

        let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
        //send a transaction
        let lastTx = await cancelOrderList(
          [allContracts.market.address],
          [true],
          [tmpOrderID],
          [true]
        );

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
        expect(params.collateral, beforeMarketAmount.sub(afterMarketAmount));

        let delEventArg = [
          owner.address, //account
          true, //isLong
          true, //isOpen
          tmpOrderID, //order
          allContracts.market.address, //market
          5, //delete reason:
          priceToBigNumber(1100), //triggerAbove
          0, //pnl
        ];

        await validTransfer({
          tokenContract: allContracts.USDC,
          blockNumber: lastTx.blockNumber,
          from: allContracts.market.address,
          to: owner.address,
          amount: 20,
          label: "The check market returns funds to the user",
        });

        await vaildDeleteOrderEvent({
          contract: allContracts.marketRouter,
          tx: lastTx,
          args: [delEventArg],
        });

        await validOrderDeleted({
          user: owner.address,
          orderID: tmpOrderID,
          label: "0",
        });
        tmpOrderID = tmpOrderID.add(1);
      }
    }
  });

  it("Delete a close a position order", async () => {
    logger.info("---Test Delete a close a position order---");
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 20,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1100,
    });
    //Open Position
    {
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1700,
        pay: 20,
        size: 200,
        isLong: true,
      });
      //send a transaction
      await increasePosition(params);
    }

    let decOrderParams = buildDecreaseOrderParam({
      market: allContracts.market.address,
      price: 2000,
      isKeepLev: true,
      size: 200,
    });
    let orderID = await ordersIndex(owner.address, "1");
    if (orderID.eq(0)) {
      orderID = BigNumber.from(1);
    }

    //add trigger order
    {
      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });
      //Calculate the price after including slippage
      let triggerPrice = calcSlippagePrice({
        price: decOrderParams._order.price,
        isLong: decOrderParams._isLong,
        isOpen: decOrderParams.isCreate,
        slippage: 0,
      });

      //The cost of constructing this transaction before sending a transaction
      let fees = buildFees({
        openFee: calcCloseFee({ sizeDelta: decOrderParams._order.size }),
        execFee: numberToBigNumber(1),
      });

      let collateral = getDecreaseDeltaCollateral({
        isKeepLev: true,
        size: position.size,
        dsize: decOrderParams._order.size,
        collateral: position.collateral,
      });

      //Accumulate each cost
      let totalFee = totalFees(fees);
      //check
      //   vaildIncreaseOrder({
      //     params: params,
      //     fees: totalFee,
      //   });

      //build the parameter list for check the order
      let args = [
        owner.address, //account,
        orderID, //orderID,
        collateral, //collateral
        decOrderParams._order.size, //size
        triggerPrice, //price
        decOrderParams._order.extra1, //tp
        decOrderParams._order.extra0, //sl
      ];

      //build UpdateOrderEvent params
      let updateEventArgs = [
        owner.address, //account
        true, //isLong
        false, //isIncrease
        orderID, //orderId,
        allContracts.market.address, // market
        decOrderParams._order.size, //size
        collateral, //collateral
        triggerPrice, //triggerPrice
        true,
        decOrderParams._order.extra1, //tp
        decOrderParams._order.extra0, //sl
        0,
        true,
      ];

      let lastTx = await connectUpdateOrder(owner, decOrderParams);

      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [updateEventArgs],
      });
      await vaildOrderExist({
        user: owner.address,
        orderID,
        label: "1",
      });

      //Whether check order is written to orderStore and check parameters
      let order = await getOrderInfo({
        user: owner.address,
        orderID,
        label: "1",
      });

      //check parameters
      vaildOrderCreated({
        order,
        args,
      });
    }
    //cancel trigger order
    {
      let oraclePrice = await getPrice(allContracts.indexToken, true);
      //Get market balances before trading
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //send a transaction
      let lastTx = await cancelOrderList(
        [allContracts.market.address],
        [false],
        [orderID],
        [true]
      );
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

      expect(
        decOrderParams.collateral,
        beforeMarketAmount.sub(afterMarketAmount)
      );

      let delEventArg = [
        owner.address, //account
        true, //isLong
        false, //isOpen
        orderID, //order
        allContracts.market.address, //market
        5, //delete reason: exec is executed //triggerAbove
        oraclePrice,
        0, //pnl
      ];

      //   console.log("orderInfo", await getOrderInfo({}));

      await validOrderDeleted({
        user: owner.address,
        orderID,
        label: "1",
      });
      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [delEventArg],
      });
    }
  });
});
