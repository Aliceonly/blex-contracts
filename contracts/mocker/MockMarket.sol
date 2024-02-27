// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IPositionBook} from "../position/interfaces/IPositionBook.sol";
import {IMarket} from "../market/interfaces/IMarket.sol";
import {IMarketValid} from "../market/interfaces/IMarketValid.sol";
import {IVaultRouter} from "../vault/interfaces/IVaultRouter.sol";
//IMarketRouter
//IMarketRouter
import {IMarketRouter} from "../market/interfaces/IMarketRouter.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MarketCallBackIntl, MarketPositionCallBackIntl, MarketOrderCallBackIntl} from "../market/interfaces/IMarketCallBackIntl.sol";

// import {DeleteOrder} from "../market/MarketRouter.sol";

contract MockMarket {
    address public PositionBook;
    address public marketValid;
    address public vaultRouter;
    address public priceFeed;
    address public collateralToken;
    address public marketRouter;

    function setMarketRouter(address mr) external {
        marketRouter = mr;
    }

    function setPositionBook(address book) external {
        PositionBook = book;
    }

    function indexToken() external view returns (address) {
        return address(this);
    }

    // function positionBook() external returns (IPositionBook) {
    //     return IPositionBook(PositionBook);
    // }

    function setMarketValid(address _newMv) external {
        marketValid = _newMv;
    }

    function setVaultRouter(address vr) external {
        vaultRouter = vr;
    }

    function setOraclePrice(address pf) external {
        priceFeed = pf;
    }

    function setCollateralToken(address token) external {
        collateralToken = token;
    }

    function getPNL() external view returns (int256) {
        return 0;
    }

    function borrowFromVault(address vr, uint256 amount) external {
        IVaultRouter(vr).borrowFromVault(amount);
    }

    function transferToVault(
        address vr,
        address account,
        uint256 amount
    ) external {
        IVaultRouter(vr).transferToVault(account, amount);
    }

    function repayToVault(address vr, uint256 amount) external {
        IVaultRouter(vr).repayToVault(amount);
    }

    //updatePositionCallback

    function updatePositionBook(address mr, address newA) external {
        IMarketRouter(mr).updatePositionBook(newA);
    }

    function deposit(
        address asset,
        address coreVault,
        uint256 assets,
        address receiver
    ) public {
        IERC20(asset).approve(coreVault, assets);
        IERC4626(coreVault).deposit(assets, receiver);
    }

    // function deleteOrderCallback(
    //     address mr,
    //     MarketOrderCallBackIntl.DeleteOrderEvent memory e
    // ) external {
    // //     IMarketRouter(mr).deleteOrderCallback(e);
    // // }
    // //// function marketValid() external returns (IMarketValid){
    // ////     return  IMarketValid(marketValid);
    // //// }
}
