// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../ac/AcUpgradable.sol";
import {IMintable} from "../token/interfaces/IMintable.sol";
import {TransferHelper, Precision} from "../utils/TransferHelper.sol";

/**
 * @title This contract can deposit esBLE and BPT to boost those two tokens into the BLE token.
 * @author
 */
contract Booster is ReentrancyGuard, AcUpgradable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public esToken;
    address public pairToken;
    address public claimableToken;

    uint256 public startDate;
    uint256 public dailyEstokenLimit;
    uint256 public constant priceDecimals =
        Precision.BOOSTER_PRICE_PRECISION_DECIMALS;
    uint256 public esTokenPrice;
    uint256 public cumulativeReward;
    event Boost(address indexed account, uint256 amount0, uint256 amount1);
    string public symbol;
    string public name;

    function initialize(
        string memory _name,
        string memory _symbol,
        address _esToken,
        address _pairToken,
        address _claimableToken,
        uint256 _startTime
    ) external initializer {
        AcUpgradable._initialize(msg.sender);
        name = _name;
        symbol = _symbol;
        esToken = _esToken;
        pairToken = _pairToken;
        claimableToken = _claimableToken;

        startDate = _startTime;
        dailyEstokenLimit = 5000 * 10 ** TransferHelper.USD_DECIMALS;
        esTokenPrice = 365 * 10 ** priceDecimals;
    }


    function boost(uint256 _amount) external nonReentrant {
        _boost(msg.sender, _amount);
    }


    function boostForAccount(
        address _account,
        uint256 _amount
    ) external nonReentrant /* onlyController */ {
        _boost(_account, _amount);
    }

    function setEsTokenPrice(uint256 amount) external onlyRole(VAULT_MGR_ROLE) {
        esTokenPrice = amount;
    }

    function setDailyEsTokenLimit(
        uint256 amount
    ) external onlyRole(VAULT_MGR_ROLE) {
        dailyEstokenLimit = amount;
    }

    //===========================
    //     view
    //===========================
    function claimable() public view returns (uint256) {
        uint256 diff = block.timestamp - startDate;
        uint256 totalClaimable = (diff * dailyEstokenLimit) /
            24 /
            3600 -
            cumulativeReward;
        return totalClaimable;
    }

    //===========================
    //     private
    //===========================
    function _boost(address _account, uint256 _amount) internal {
        require(_amount > 0, "Vester: invalid _amount");
        require(_amount <= claimable(), "today limit reached");


        IERC20(esToken).safeTransferFrom(_account, address(this), _amount);


        uint256 amount1 = (_amount * esTokenPrice) / (10 ** priceDecimals);

        IERC20(pairToken).safeTransferFrom(_account, address(this), amount1);

        IMintable(claimableToken).mint(_account, _amount);
        cumulativeReward += _amount;
        emit Boost(_account, _amount, amount1);
    }

    uint256[50] private ______gap;
}
