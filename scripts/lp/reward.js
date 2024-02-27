const { ethers } = require('hardhat');

describe('Withdrawal Tests', function () {
  let vaultRouter;
  let coreVault;
  let vaultReward;
  let rewardDistributor;
  let usdc;

  const user = '0xUserAddress';

  before(async function () {
    const VaultRouter = await ethers.getContractFactory('VaultRouter');
    vaultRouter = await VaultRouter.deploy();

    const CoreVault = await ethers.getContractFactory('CoreVault');
    coreVault = await CoreVault.deploy();

    const VaultReward = await ethers.getContractFactory('VaultReward');
    vaultReward = await VaultReward.deploy();

    const RewardDistributor = await ethers.getContractFactory(
      'RewardDistributor'
    );
    rewardDistributor = await RewardDistributor.deploy();

    const USDC = await ethers.getContractFactory('USDC');
    usdc = await USDC.deploy();
  });

  it('should withdraw part of the reward', async function () {
    const amountToWithdraw = ethers.utils.parseUnits('1000', 6);

    // First, deposit some USDC into the CoreVault
    const amountToDeposit = ethers.utils.parseUnits('5000');
    await usdc.transfer(coreVault.address, amountToDeposit);
    await coreVault.deposit(amountToDeposit);

    // Calculate how much shares the user should have after the deposit
    const pricePerShare = await coreVault.getPricePerShare();
    const shares = amountToDeposit.div(pricePerShare);

    // Transfer some reward to the VaultReward contract
    await usdc.approve(vaultReward.address, amountToWithdraw);
    await vaultReward.depositReward(amountToWithdraw);

    // Let the VaultReward contract track the CoreVault
    await vaultRouter.addVault(coreVault.address, 0);
    await vaultReward.setVaultReward(coreVault.address, vaultRouter.address);

    // Distribute the reward to the user's address
    await vaultReward.distributeReward(user, shares);

    // Check the user's balance before the withdrawal
    const userUsdcBefore = await usdc.balanceOf(user);

    // Attempt to withdraw some of the reward
    await coreVault.withdraw(user, amountToWithdraw);

    // Check the user's balance after the withdrawal
    const userUsdcAfter = await usdc.balanceOf(user);

    // Ensure that the correct amount was withdrawn
    assert.equal(
      userUsdcAfter.sub(userUsdcBefore).toString(),
      amountToWithdraw.toString(),
      'Incorrect amount withdrawn'
    );
  });

  it('should withdraw all of the reward', async function () {
    // First, deposit some USDC into the CoreVault
    const amountToDeposit = ethers.utils.parseUnits('5000');
    await usdc.transfer(coreVault.address, amountToDeposit);
    await coreVault.deposit(amountToDeposit);

    // Calculate how much shares the user should have after the deposit
    const pricePerShare = await coreVault.getPricePerShare();
    const shares = amountToDeposit.div(pricePerShare);

    // Transfer some reward to the VaultReward contract
    const totalReward = ethers.utils.parseUnits('5000', 6);
    await usdc.approve(vaultReward.address, totalReward);
    await vaultReward.depositReward(totalReward);

    // Let the VaultReward contract track the CoreVault
    await vaultRouter.addVault(coreVault.address, 0);
    await vaultReward.setVaultReward(coreVault.address, vaultRouter.address);

    // Distribute the reward to the user's address
    await vaultReward.distributeReward(user, shares);

    // Check the user's balance before the withdrawal
    const userUsdcBefore = await usdc.balanceOf(user);

    // Attempt to withdraw all of the reward
    await coreVault.withdrawAll(user);

    // Check the user's balance after the withdrawal
    const userUsdcAfter = await usdc.balanceOf(user);

    // Ensure that the correct amount was withdrawn
    assert.equal(
      userUsdcAfter.sub(userUsdcBefore).toString(),
      totalReward.toString(),
      'Incorrect amount withdrawn'
    );
  });
});
