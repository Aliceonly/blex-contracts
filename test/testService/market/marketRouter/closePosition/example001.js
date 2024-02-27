// const { ethers } = require("hardhat");
// const {
//   deployServiceAllMarket,
//   userMintAndApprove,
//   execCancelOrderAndLiqPosition,
//   readServiceAllMarket,
// } = require("../../../deploy/deployAllContract");
// const { execPrePare } = require("../../../utils/buildLogic");
// const {
//   buildIncreasePositionParam,
//   buildFees,
//   buildIncreaseOrderParam,
//   buildDecreaseOrderParam,
//   buildDecreasePositionParam,
// } = require("../../../utils/buildParams");
// const {
//   validSize,
//   validBalanceChange,
//   validTransfer,
//   validPnl,
//   validCollateral,
//   validAvgPrice,
//   vaildUpdatePositionEvent,
//   vaildOrderExist,
// } = require("../../../utils/vaildData");
// const {
//   getCurrentPosition,
//   calcOpenFee,
//   totalFees,
//   calcMarketAmount,
//   calcPNL,
//   calcCollateral,
//   calAveragePrice,
//   priceToBigNumber,
//   numberToBigNumber,
//   calcCloseFee,
//   calcSlippagePrice,
//   getOrderInfo,
//   calcAUM,
//   logger,
// } = require("../../../utils/utils");
// const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
// const {
//   vaildPosition,
//   vaildDecreaseOrder,
// } = require("../../../utils/vaildPosition");
// const { balanceOf } = require("../../../../../scripts/mock/erc20");
// const {
//   getMarketFundsUsed,
//   getAUM,
//   getUSDBalance,
//   getGlobalPnl,
// } = require("../../../../../scripts/vault/vaultRouter");
// const {
//   increasePosition,
//   connectUpdateOrder,
//   decreasePosition,
// } = require("../../../../../scripts/market/marketRouter");
// const {
//   vaildIncreaseOrder,
//   vaildOrderCreated,
//   vaildUpdateOrderEvent,
//   vaildDeleteOrderEvent,
// } = require("../../../utils/vaildOrder");
// const {
//   getAccountOrderNumber,
//   ordersIndex,
// } = require("../../../../../scripts/order/orderStore");
// const { BigNumber } = require("ethers");

// describe("close position", async () => {
//   let allContracts;
//   let owner, second, third;
//   beforeEach(async () => {
//     allContracts = await readServiceAllMarket();

//     [owner, second, third] = await ethers.getSigners();
//     await execCancelOrderAndLiqPosition({
//       users: [owner, second, third],
//       market: allContracts.market.address,
//       orderBookLong: allContracts.orderBookLong,
//       orderBookShort: allContracts.orderBookShort,
//       indexToken: allContracts.indexToken,
//     });
//   });

//   it("Delete the trigger order when testing to close the position, whether the execution fee is deducted, the trigger order should be deleted", async () => {
//     logger.info(
//       "---Delete the trigger order when testing to close the position, whether the execution fee is deducted, the trigger order should be deleted---"
//     );
//     await execPrePare({
//       user: owner,
//       amount: 10,
//       marketRouter: allContracts.marketRouter,
//       indexToken: allContracts.indexToken,
//       price: 30500,
//     });

//     //Build and increase position parameters
//     let params = buildIncreasePositionParam({
//       market: allContracts.market.address,
//       price: 30500,
//       pay: 10,
//       size: 90,
//       isLong: true,
//     });
//     //Used to hold collateral  balances
//     let afterCollD;

//     //Increase positions for users
//     {
//       //check  the user's position before executing the trade
//       await validSize({
//         user: owner.address,
//         price: 0,
//         isLong: true,
//         size: 0,
//       });
//       //Get the  user current position
//       let position = await getCurrentPosition({
//         user: owner.address,
//         price: 30500,
//         isLong: true,
//       });
//       //Get opening fee
//       let openFee = calcOpenFee({
//         sizeDelta: params._sizeDelta,
//       });

//       //Construct the various fees of this transaction
//       let fees = buildFees({
//         openFee: openFee,
//       });

//       //Sum up the various expenses
//       let totalFee = totalFees(fees);
//       //Get oracle price

//       let oracelPrice = await getPrice(allContracts.indexToken, true);
//       //Used to check  the position
//       params._oraclePrice = oracelPrice;
//       // check  the position
//       vaildPosition({
//         params: params,
//         position: position,
//         fees: fees,
//       });

//       //Get the market balance before the transaction is initiated
//       let beforeMarketAmount = await balanceOf(allContracts.market.address);
//       let beforeAum = await getAUM();
//       let beforeUSD = await getUSDBalance();
//       let beforePNL = await getGlobalPnl();

//       let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
//       //Get market borrow funds before trading

//       let beforeMarketFundsUsed = await getMarketFundsUsed(
//         allContracts.market.address
//       );

//       //Open Position
//       let lastTx = await increasePosition(params);
//       //Obtain market borrowing funds after the transaction is completed
//       let afterMarketFundsUsed = await getMarketFundsUsed(
//         allContracts.market.address
//       );

//       //check
//       validBalanceChange(
//         params._sizeDelta,
//         afterMarketFundsUsed.sub(beforeMarketFundsUsed),
//         "Check borrow size changes"
//       );

//       //Calculate the collD required for the emit event
//       let collD = params.collateralDelta.sub(totalFee);

//       //Build event parameter list
//       let eventArgs = [
//         owner.address, //account
//         params.collateralDelta, //collateralDelta
//         collD, //collD
//         params._sizeDelta, //size
//         true, //isLong
//         oracelPrice, //oraclePrice
//         0, //pnl
//         fees, //fees []int
//         allContracts.market.address, //market
//         allContracts.collateralToken, //collateralToken
//         allContracts.indexToken, // indextoken
//         0, //category Open Position is 0, increase collateral  is 2
//         0, //fromOrder
//       ];

//       //Get the market balance after the transaction is completed
//       let afterMarketAmount = await balanceOf(allContracts.market.address);
//       let afterAum = await getAUM();
//       let afterUSD = await getUSDBalance();
//       let afterPNL = await getGlobalPnl();

//       let afterCalcAUM = calcAUM(afterPNL, afterUSD);

//       validBalanceChange(
//         afterCalcAUM.sub(beforeCalcAum),
//         afterAum.sub(beforeAum),
//         "Check AUM value change"
//       );
//       validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

//       //Calculate the funds that the market should receive
//       let marketAmount = calcMarketAmount({
//         amount: params.collateralDelta,
//         fee: totalFee,
//       });
//       //check  market balance changes
//       validBalanceChange(
//         marketAmount,
//         afterMarketAmount.sub(beforeMarketAmount),
//         "check  market balance changes"
//       );
//       //check  user's position after trade execution
//       await validSize({
//         user: owner.address,
//         price: 30500,
//         size: 90,
//       });

//       //check feeRouter
//       await validTransfer({
//         tokenContract: allContracts.USDC,
//         blockNumber: lastTx.blockNumber,
//         from: allContracts.market.address,
//         to: allContracts.allFee.feeVault.address,
//         amount: totalFee,
//         label: "The feeRouter balance does not correspond to the expected one",
//         expandDecimals: false,
//       });

//       //check  the user balance transferred to the market amount
//       await validTransfer({
//         tokenContract: allContracts.USDC,
//         blockNumber: lastTx.blockNumber,
//         from: owner.address,
//         to: allContracts.market.address,
//         amount: 10,
//         label: "The amount transferred to the market by the user does not correspond to the expected amount",
//       });

//       //get position
//       position = await getCurrentPosition({
//         user: owner.address,
//         price: 30500,
//         isLong: true,
//       });
//      //Check PNL, because it is the first time to add a position, so PNL should be 0
//       //Calculate PNL locally,,

//       let result = calcPNL({
//         position,
//         price: 30500,
//       });
//       let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

//       await validPnl({
//         user: owner.address,
//         price: 30500,
//         isLong: true,
//         pnl: pnl,
//       });

//       let coll = calcCollateral({
//         pay: params.collateralDelta,
//         fees: totalFee,
//       });
//       afterCollD = coll;
//       //check collateral
//       await validCollateral({
//         user: owner.address,
//         price: 30500,
//         isLong: params._isLong,
//         coll,
//       });

//       //Check average price
//       await validAvgPrice({
//         user: owner.address,
//         price: 30500,
//         isLong: true,
//         price0: calAveragePrice({
//           position: position,
//           sizeDelta: params._sizeDelta,
//           marketPrice: oracelPrice,
//           pnl: 0,
//           hasProfit: true,
//         }),
//       });
//       //check  event and corresponding parameters
//       await vaildUpdatePositionEvent({
//         contract: allContracts.marketRouter,
//         tx: lastTx,
//         args: eventArgs,
//       });
//     }
//     //Add a pending order to a designated user
//     {
//       await userMintAndApprove(owner, 20, allContracts.marketRouter);
//       //Get user position
//       let position = await getCurrentPosition({
//         user: owner.address,
//         price: 30500,
//         isLong: true,
//       });

//       let orderID = await ordersIndex(owner.address, "0");
//       if (orderID.eq(0)) {
//         orderID = BigNumber.from(1);
//       }

//       //Build pending order parameters
//       let inputs = buildIncreaseOrderParam({
//         market: allContracts.market.address,
//         price: 30500,
//         size: 200,
//       });

//       //Calculate the price after including slippage
//       let triggerPrice = calcSlippagePrice({
//         price: inputs._order.price,
//         isLong: inputs._isLong,
//         isOpen: inputs.isCreate,
//         slippage: 30,
//       });

//       let fees = buildFees({
//         closeFee: calcCloseFee({ sizeDelta: inputs._order.size }),
//         execFee: numberToBigNumber(1),
//       });

//       let totalFee = totalFees(fees);
//       //check
//       vaildIncreaseOrder({
//         params: inputs,
//         fees: totalFee,
//       });

//       //build the parameter list for check the order
//       let args = [
//         owner.address, //account,
//         orderID, //orderID,
//         inputs._order.collateral, //collateral
//         inputs._order.size, //size
//         triggerPrice, //price
//         inputs._order.extra1, //tp
//         inputs._order.extra0, //sl
//       ];

//       //build UpdateOrderEvent params
//       let updateEventArgs = [
//         owner.address, //account
//         true, //isLong
//         true, //isIncrease
//         orderID, //orderId,
//         allContracts.market.address, // market
//         inputs._order.size, //size
//         inputs._order.collateral, //collateral
//         triggerPrice, //triggerPrice
//         false,
//         inputs._order.extra1, //tp
//         inputs._order.extra0, //sl
//         0,
//         false,
//       ];

//       let beforeMarketAmount = await balanceOf(allContracts.market.address);
//       let beforeAum = await getAUM();
//       let beforeUSD = await getUSDBalance();
//       let beforePNL = await getGlobalPnl();

//       let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

//       let lastTx = await connectUpdateOrder(owner, inputs);
//       let afterMarketAmount = await balanceOf(allContracts.market.address);
//       let afterAum = await getAUM();
//       let afterUSD = await getUSDBalance();
//       let afterPNL = await getGlobalPnl();

//       let afterCalcAUM = calcAUM(afterPNL, afterUSD);

//       validBalanceChange(
//         afterCalcAUM.sub(beforeCalcAum),
//         afterAum.sub(beforeAum),
//         "Check AUM value change"
//       );

//       validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

//       validBalanceChange(
//         inputs._order.collateral,
//         afterMarketAmount.sub(beforeMarketAmount),
//         "check   order  collateral"
//       );
//       await vaildOrderExist({
//         user: owner.address,
//         orderID: orderID,
//         label: "0",
//       });

//       //Whether check order is written to orderStore and check parameters
//       let order = await getOrderInfo({
//         user: owner.address,
//         orderID: orderID,
//         label: "0",
//       });

//       //check parameters
//       vaildOrderCreated({
//         order,
//         args,
//       });

//       //check  the amount of the user's pending order
//       await validTransfer({
//         tokenContract: allContracts.USDC,
//         blockNumber: lastTx.blockNumber,
//         from: owner.address,
//         to: allContracts.market.address,
//         amount: 20,
//         label: "check  the amount of the user's pending order error",
//       });
//     }
//     let triggerOrders = new Array(5);
//     //Create 5 Trigger orders
//     {
//       for (let index = 0; index < 5; index++) {
//         //build parameters
//         let inputs = buildDecreaseOrderParam({
//           market: allContracts.market.address,
//           price: 30500,
//           size: 10,
//         });
//         let orderID = await ordersIndex(owner.address, "1");
//         if (orderID.eq(0)) {
//           orderID = BigNumber.from(1);
//         }
//         triggerOrders[index] = orderID;
//         //Get the  user current position
//         let position = await getCurrentPosition({
//           user: owner.address,
//           price: 30500,
//           isLong: true,
//         });
//         //Get oracle price
//         let oraclePrice = await getPrice(allContracts.indexToken, false);

//         //List of fees required to construct this lighten-up
//         let fees = buildFees({
//           closeFee: calcCloseFee({ sizeDelta: inputs._order.size }),
//           execFee: numberToBigNumber(1),
//         });
//         let totalFee = totalFees(fees);

//         let decrOrderCount = await getAccountOrderNumber(owner.address, "1");

//         //check decrease position parameters
//         vaildDecreaseOrder({
//           collateral: position.collateral,
//           collateralDelta: inputs._order.collateral,
//           size: position.size,
//           sizeDelta: inputs._order.size,
//           fees: totalFee,
//           decrOrderCount: decrOrderCount,
//         });

//         //Calculate the margin for this time to reduce the position
//         let collateralDelta = position.collateral.div(9);

//         let eventArg = [
//           owner.address,
//           true,
//           false,
//           orderID,
//           allContracts.market.address,
//           inputs._order.size,
//           collateralDelta,
//           oraclePrice,
//           false,
//           0,
//           0,
//           0,
//           true,
//           inputs,
//         ];

//       //send a transaction
//         let tx = await connectUpdateOrder(owner, inputs);

//        //Query whether the order has been inserted
//         await vaildOrderExist({
//           user: owner.address,
//           orderID,
//           label: "1",
//         });

//        //Construct the validation parameters of the order
//         let vaildOrderArgs = [
//           owner.address, //account
//           orderID, //orderID,
//           collateralDelta, //collateral
//           inputs._order.size,
//           oraclePrice,
//           inputs._order.extra1,
//           inputs._order.extra0,
//         ];

//        //check  event parameters
//         await vaildUpdateOrderEvent({
//           contract: allContracts.marketRouter,
//           tx: tx,
//           args: [eventArg],
//         });

//         //Get the order data written into the contract for this transaction
//         let orderInfo = await getOrderInfo({
//           user: owner.address,
//           orderID,
//           label: "1",
//         });
//         //check  the data written this time
//         vaildOrderCreated({
//           order: orderInfo,
//           args: vaildOrderArgs,
//         });
//       }
//     }

//     let beforeAum = await getAUM();
//     let beforeUSD = await getUSDBalance();
//     let beforePNL = await getGlobalPnl();

//     let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
//     let position = await getCurrentPosition({
//       user: owner.address,
//       price: 29000,
//       isLong: true,
//     });
//    //Set the oracle price calc AUM
//     await setPrice(allContracts.indexToken, 29000);

//     let afterAum = await getAUM();
//     let afterUSD = await getUSDBalance();
//     let afterPNL = await getGlobalPnl();

//     let afterCalcAUM = calcAUM(afterPNL, afterUSD);

//     validBalanceChange(
//       afterCalcAUM.sub(beforeCalcAum),
//       afterAum.sub(beforeAum),
//       "Check AUM value change"
//     );

//     validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

//     //Close all positions
//     {
//       //check user size
//       await validSize({
//         user: owner.address,
//         price: 0,
//         size: 90,
//       });
//       let oraclePrice = await getPrice(allContracts.indexToken, true);

//       //build closing  postion parameters
//       let decParams = buildDecreasePositionParam({
//         market: allContracts.market.address,
//         price: 40000 - 100,
//         size: 90,
//       });

//       decParams._oraclePrice = oraclePrice;

//       //build the list of fees required for this transaction
//       let fees = buildFees({
//         closeFee: calcCloseFee({
//           sizeDelta: decParams._sizeDelta,
//         }),
//         execFee: numberToBigNumber(5), //Five trigger single fees
//       });

//       //add up the fees
//       let totalFee = totalFees(fees);

//       //Get the  user current position
//       let position = await getCurrentPosition({
//         user: owner.address,
//         price: 29000,
//       });

//       //Check positions (margin, leverage, slippage, etc.)
//       vaildPosition({
//         params: decParams,
//         position,
//         fees: fees,
//       });

//       //Get market borrow funds before trading
//       let beforeMarketFundsUsed = await getMarketFundsUsed(
//         allContracts.market.address
//       );
//       //Get market balances before trading
//       let beforeMarketAmount = await balanceOf(allContracts.market.address);
//       let beforeAum = await getAUM();
//       let beforeUSD = await getUSDBalance();
//       let beforePNL = await getGlobalPnl();

//       let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
//       //close a position
//       let lastTx = await decreasePosition(decParams);
//       //Obtain market borrowing funds after the transaction is completed
//       let afterMarketFundsUsed = await getMarketFundsUsed(
//         allContracts.market.address
//       );
//       //Get market balance after trade execution
//       let afterMarketAmount = await balanceOf(allContracts.market.address);
//       let afterAum = await getAUM();
//       let afterUSD = await getUSDBalance();
//       let afterPNL = await getGlobalPnl();

//       let afterCalcAUM = calcAUM(afterPNL, afterUSD);

//       validBalanceChange(
//         afterCalcAUM.sub(beforeCalcAum),
//         afterAum.sub(beforeAum),
//         "Check AUM value change"
//       );
//       validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

//       //checkvault borrow size
//       validBalanceChange(
//         decParams._sizeDelta,
//         beforeMarketFundsUsed.sub(afterMarketFundsUsed),
//         "checkvault borrow size"
//       );

//       //checkvault borrow size
//       validBalanceChange(
//         afterCollD,
//         beforeMarketAmount.sub(afterMarketAmount),
//         "checkvault borrow size"
//       );
//       //Check the position after completing the transaction
//       await validSize({
//         user: owner.address,
//         price: 0,
//         isLong: true,
//         size: 0,
//       });

//       //check feeRouter
//       await validTransfer({
//         tokenContract: allContracts.USDC,
//         blockNumber: lastTx.blockNumber,
//         from: allContracts.market.address,
//         to: allContracts.allFee.feeVault.address,
//         amount: totalFee,
//         label: "check  the amount transferred from market to feeVault",
//         expandDecimals: false,
//       });
//       //Calculate the current user profit
//       let result = calcPNL({
//         position,
//         price: 29000,
//       });
//       let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);
//       //Calculate the current user profit
//       let collD = afterCollD.sub(totalFee);
//       console.log(collD, pnl);

//       //Calculate the funds the user should receive
//       let receiveAmount = collD.add(pnl);

//       //check  the user balance transferred to the market amount
//       await validTransfer({
//         tokenContract: allContracts.USDC,
//         blockNumber: lastTx.blockNumber,
//         from: allContracts.market.address,
//         to: owner.address,
//         amount: receiveAmount,
//         label: "checkclose a position  After the user's profit and loss",
//         expandDecimals: false,
//       });


//       await validTransfer({
//         tokenContract: allContracts.USDC,
//         blockNumber: lastTx.blockNumber,
//         from: allContracts.market.address,
//         to: allContracts.lpContracts.vault.address,
//         amount: pnl.lt(0) ? pnl.mul(-1) : pnl,
//         label: "check vault funds in and out",
//         expandDecimals: false,
//       });

//       //Build close a position emit event parameter list
//       let updatEventArg = [
//         owner.address, //account
//         afterCollD, //collateralDelta
//         afterCollD, //collateralDeltaAfter
//         decParams._sizeDelta, //_sizeDelta
//         true, //_isLong
//         oraclePrice, //_oraclePrice
//         pnl, //realisedPnl
//         fees, //fees
//         allContracts.market.address, //_market
//         allContracts.collateralToken, //collateralToken
//         allContracts.indexToken, //indexToken

//         0, //_fromOrder
//       ];

//       await vaildUpdatePositionEvent({
//         contract: allContracts.marketRouter,
//         tx: lastTx,
//         args: updatEventArg,
//       });

//       //build 5 trigger cancellation events
//       let totalCancelEvent = new Array(5);
//       for (let j = 0; j < 5; j++) {
//         let cancelEvent = [
//           owner.address,
//           decParams._isLong,
//           decParams.isOpen,
//           triggerOrders[j],
//           decParams._market,
//           2, //cancel reason
//           oraclePrice,
//           0,
//         ];

//         totalCancelEvent[j] = cancelEvent;
//       }

//       await vaildDeleteOrderEvent({
//         contract: allContracts.marketRouter,
//         tx: lastTx,
//         args: totalCancelEvent,
//       });
//     }
//   });
// });
