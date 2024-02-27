const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('USDC Tests', function () {
  let usdc;

  before(async function () {
    const USDC = await ethers.getContractFactory('USDC');
    usdc = await USDC.deploy();
  });

  it('should initialize with zero balance', async function () {
    const initialBalance = await usdc.balanceOf(owner.address);
    expect(initialBalance).to.equal(0);
  });
});
