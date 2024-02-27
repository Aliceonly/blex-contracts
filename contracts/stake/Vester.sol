// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/IMintable.sol";

import "../ac/AcUpgradable.sol";

/**
 * @title Vest Unlock: After storing esBLE in Vest,
 * each day 1/365 of esBLE will be unlocked as BLE (1 BLE = 1 esBLE).
 * It can be fully unlocked in one year.
 * If the unlocking is not complete, only the entire amount of esBLE can be withdrawn.
 * Each deposit will refresh the remaining unlocking time to 365 days.
 * Depositing/withdrawing all requires claiming all converted BLE simultaneously.
 * For the partial Vest unlocking, users need to manually claim it.
 * @author
 */
contract Vester is IERC20, ReentrancyGuard, AcUpgradable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public vestingDuration;

    address public stakeToken;
    address public claimableToken;

    uint256 public override totalSupply;
    bool public hasMaxVestableAmount;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public cumulativeClaimAmounts;
    mapping(address => uint256) public claimedAmounts;
    mapping(address => uint256) public lastVestingTimes;

    event Claim(address receiver, uint256 amount);
    event Deposit(address account, uint256 amount);
    event Withdraw(address account, uint256 claimedAmount, uint256 balance);

    function initialize(
        string memory _name,
        string memory _symbol, //VESBLE
        uint256 _vestingDuration,
        address _stakeToken,
        address _claimableToken
    ) external initializer {
        AcUpgradable._initialize(msg.sender);
        name = _name;
        symbol = _symbol;
        vestingDuration = _vestingDuration;
        stakeToken = _stakeToken;
        claimableToken = _claimableToken;
    }

    function deposit(uint256 _amount) external nonReentrant {
        _deposit(msg.sender, _amount);
    }

    function depositForAccount(
        address _account,
        uint256 _amount
    ) external nonReentrant /* onlyController */ {
        _deposit(_account, _amount);
    }

    function claim() external nonReentrant returns (uint256) {
        return _claim(msg.sender, msg.sender);
    }

    function claimForAccount(
        address _account
    ) external nonReentrant /* onlyController */ returns (uint256) {
        return _claim(_account, _account);
    }

    function withdrawToken(
        address _token,
        address _account,
        uint256 _amount
    ) external onlyRole(VAULT_MGR_ROLE) {
        IERC20(_token).safeTransfer(_account, _amount);
    }

    function withdrawForAccount(
        address account
    ) external nonReentrant /* onlyController */ {
        address _receiver = account;

        _claim(account, _receiver);

        uint256 claimedAmount = cumulativeClaimAmounts[account];
        uint256 balance = balances[account];

        uint256 totalVested = balance.add(claimedAmount);
        require(totalVested > 0, "Vester: vested amount is zero");

        IMintable(stakeToken).mint(_receiver, balance);

        _burn(account, balance);

        delete cumulativeClaimAmounts[account];
        delete claimedAmounts[account];
        delete lastVestingTimes[account];

        emit Withdraw(account, claimedAmount, balance);
    }

    function claimable(address _account) public view returns (uint256) {
        uint256 amount = cumulativeClaimAmounts[_account].sub(
            claimedAmounts[_account]
        );
        uint256 nextClaimable = _getNextClaimableAmount(_account);
        return amount.add(nextClaimable);
    }

    function getTotalVested(address _account) public view returns (uint256) {
        return balances[_account].add(cumulativeClaimAmounts[_account]);
    }

    function balanceOf(
        address _account
    ) public view override returns (uint256) {
        return balances[_account];
    }

    function getVestedAmount(address _account) public view returns (uint256) {
        uint256 balance = balances[_account];
        uint256 cumulativeClaimAmount = cumulativeClaimAmounts[_account];
        return balance.add(cumulativeClaimAmount);
    }

    function _deposit(address _account, uint256 _amount) private {
        require(_amount > 0, "Vester: invalid _amount");

        _updateVesting(_account);

        IERC20(stakeToken).safeTransferFrom(_account, address(this), _amount);

        _mint(_account, _amount);

        emit Deposit(_account, _amount);
    }

    function _updateVesting(address _account) private {
        uint256 amount = _getNextClaimableAmount(_account);

        lastVestingTimes[_account] = block.timestamp;

        if (amount == 0) return;

        _burn(_account, amount);

        cumulativeClaimAmounts[_account] = cumulativeClaimAmounts[_account].add(
            amount
        );

        IMintable(stakeToken).burn(address(this), amount);
    }

    function _getNextClaimableAmount(
        address _account
    ) private view returns (uint256) {
        uint256 timeDiff = block.timestamp.sub(lastVestingTimes[_account]);

        uint256 balance = balances[_account];

        if (balance == 0) return 0;

        uint256 vestedAmount = getVestedAmount(_account);

        uint256 claimableAmount = vestedAmount.mul(timeDiff).div(
            vestingDuration
        );

        if (claimableAmount < balance) return claimableAmount;

        return balance;
    }

    function _claim(
        address _account,
        address _receiver
    ) private returns (uint256) {
        _updateVesting(_account);
        uint256 amount = claimable(_account);

        claimedAmounts[_account] = claimedAmounts[_account].add(amount);

        IMintable(claimableToken).mint(_receiver, amount);

        emit Claim(_account, amount);
        return amount;
    }

    //====================================

    //====================================

    function setHasMaxVestableAmount(
        bool _hasMaxVestableAmount
    ) external onlyRole(VAULT_MGR_ROLE) {
        hasMaxVestableAmount = _hasMaxVestableAmount;
    }

    //=======================================

    //=======================================

    function _mint(address _account, uint256 _amount) private {
        require(_account != address(0), "Vester: mint to the zero address");

        totalSupply = totalSupply.add(_amount);
        balances[_account] = balances[_account].add(_amount);

        emit Transfer(address(0), _account, _amount);
    }

    function _burn(address _account, uint256 _amount) private {
        require(_account != address(0), "Vester: burn from the zero address");

        balances[_account] = balances[_account].sub(
            _amount,
            "Vester: burn amount exceeds balance"
        );
        totalSupply = totalSupply.sub(_amount);

        emit Transfer(_account, address(0), _amount);
    }

    function transfer(
        address /* recipient */,
        uint256 /* amount */
    ) public pure override returns (bool) {
        revert("Vester: non-transferrable");
    }

    function allowance(
        address /* owner */,
        address /* spender */
    ) public view virtual override returns (uint256) {
        return 0;
    }

    function approve(
        address /* spender */,
        uint256 /* amount */
    ) public virtual override returns (bool) {
        revert("Vester: non-transferrable");
    }

    function transferFrom(
        address /* sender */,
        address /* recipient */,
        uint256 /* amount */
    ) public virtual override returns (bool) {
        revert("Vester: non-transferrable");
    }

    uint256[50] private ______gap;
}
