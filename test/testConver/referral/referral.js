const {
  deployReferral,
  setTier,

  getTigers,
  readReferral,
  getReferrerTier,
  setReferrerTier,
  getReferrerDiscountShares,
  setReferrerDiscountShare,
  getTraderReferralCodes,
  setTraderReferralCode,
  setTraderReferralCodeByUser,
  getCodeOwner,
  registerCode,
  setCodeOwner,
  govSetCodeOwner,
  getTraderReferralInfo,
  getCodeOwners,
  updatePositionCallback,
  initializeReferral,
} = require("../../../scripts/referral/referral");
const { grantRoleIfNotGranted } = require("../../../scripts/utils/helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Referral", async function () {
  let refContract;
  let referral;
  let owner, second, third;
  beforeEach(async function () {
    [owner, second, third] = await ethers.getSigners();
    referral = await deployReferral();

    await initializeReferral();
    console.log(referral.address);

    await grantRoleIfNotGranted(referral, "ROLE_CONTROLLER", owner.address);
    await grantRoleIfNotGranted(referral, "ROLE_CONTROLLER", second.address);
    await grantRoleIfNotGranted(referral, "MANAGER_ROLE", owner.address);
    await grantRoleIfNotGranted(referral, "MANAGER_ROLE", second.address);
  });

  it("setTier", async function () {
    await setTier(0, 1000, 1000);
    expect((await getTigers(0)).totalRebate).to.be.equal(1000);
    expect((await getTigers(0)).discountShare).to.be.equal(1000);
    let referContract = await readReferral();
    await expect(setTier(0, 2000, 2000))
      .to.be.emit(referContract, "SetTier")
      .withArgs(0, 2000, 2000);
    expect((await getTigers(0)).totalRebate).to.be.equal(2000);
    expect((await getTigers(0)).totalRebate).to.be.equal(2000);
  });

  it("setReferrerTier", async function () {
    await setTier(100, 1000, 1000);
    expect(await getReferrerTier(owner.address)).to.equal(0);
    await setReferrerTier(owner.address, 100);
    expect(await getReferrerTier(owner.address)).to.equal(100);
  });

  it("setReferrerDiscountShare", async function () {
    expect(await getReferrerDiscountShares(owner.address)).to.be.equal(0);
    await setReferrerDiscountShare(owner.address, 5000);
    expect(await getReferrerDiscountShares(owner.address)).to.be.equal(5000);
  });

  it("setTraderReferralCode", async function () {
    expect(await getTraderReferralCodes(owner.address)).to.be.equal(
      ethers.constants.HashZero
    );
    let code = ethers.utils.formatBytes32String("code");
    await setTraderReferralCode(owner.address, code);
    expect(await getTraderReferralCodes(owner.address)).to.be.equal(code);
  });

  it("setTraderReferralCodeByUser", async function () {
    let newCode = ethers.utils.formatBytes32String("new_code");
    await setTraderReferralCodeByUser(newCode);
    let result1 = await getTraderReferralInfo(owner.address);
    expect(result1[0]).to.be.equal(newCode);
  });

  it("registerCode", async function () {
    let code = ethers.utils.formatBytes32String("code_code");
    expect(await getCodeOwner(code)).to.be.equal(ethers.constants.AddressZero);
    await registerCode(code);
    expect(await getCodeOwner(code)).to.be.equal(owner.address);
  });

  it("setCodeOwner", async function () {
    let code = ethers.utils.formatBytes32String("code_code");
    await registerCode(code);
    expect(await getCodeOwner(code)).to.be.equal(owner.address);
    await setCodeOwner(code, second.address);
    expect(await getCodeOwner(code)).to.be.equal(second.address);
  });

  it("govSetCodeOwner", async function () {
    let code = ethers.utils.formatBytes32String("code_code");
    await registerCode(code);
    expect(await getCodeOwner(code)).to.be.equal(owner.address);
    await govSetCodeOwner(code, second.address);
    expect(await getCodeOwner(code)).to.be.equal(second.address);
  });

  it("getCodeOwners", async function () {
    let codes = [
      "code1",
      "code2",
      "code3",
      "code4",
      "code5",
      "code6",
      "code7",
      "code8",
      "code9",
    ];
    let codex = new Array(codes.length);
    for (let i = 0; i < codes.length; i++) {
      codex[i] = ethers.utils.formatBytes32String(codes[i]);
    }

    for (let i = 0; i < codex.length; i++) {
      expect(await getCodeOwner(codex[i])).to.be.equal(
        ethers.constants.AddressZero
      );
      await registerCode(codex[i]);
      expect(await getCodeOwner(codex[i])).to.be.equal(owner.address);
    }

    let res = await getCodeOwners(codex);
    expect(res.length).to.be.equal(codex.length);
    for (let i = 0; i < res.length; i++) {
      expect(res[i]).to.be.equal(owner.address);
    }
  });

  // it("Emit IncreasePositionReferral ", async function () {
  //   let code = ethers.utils.formatBytes32String("des_code");
  //   await setTraderReferralCodeByUser(code);
  //   let codeResult = await getTraderReferralInfo(owner.address);

  //   let params = {
  //     inputs: {
  //       _market: ethers.constants.AddressZero,
  //       _isLong: true,
  //       _oraclePrice: 0,
  //       isOpen: true,
  //       _account: owner.address,
  //       _sizeDelta: ethers.utils.parseUnits(100 + "", 18),
  //       _price: ethers.utils.parseUnits(String(1000), 30),
  //       _slippage: 30,
  //       _isExec: false,
  //       liqState: 0,
  //       _fromOrder: 0,
  //       _refCode: ethers.utils.formatBytes32String("des_code"), //todo
  //       collateralDelta: ethers.utils.parseUnits(100 + "", 18),
  //       execNum: 0,
  //       inputs: [
  //         ethers.utils.parseUnits(String(1200), 30), //tp
  //         ethers.utils.parseUnits(String(900), 30), //sl
  //       ],
  //     },
  //     position: {
  //       market: ethers.constants.AddressZero,
  //       isLong: true,
  //       lastTime: 0,
  //       extra3: 0,
  //       size: 0,
  //       collateral: 0,
  //       averagePrice: 0,
  //       entryFundingRate: 0,
  //       realisedPnl: 0,
  //       extra0: 0,
  //       extra1: 0,
  //       extra2: 0,
  //     },
  //     fees: [0, 0, 0, 0, 0],
  //     collateralToken: ethers.constants.AddressZero,
  //     indexToken: ethers.constants.AddressZero,
  //     collateralDeltaAfter: 0,
  //   };

  //   await expect(updatePositionCallback(params))
  //     .to.be.emit(await readReferral(), "IncreasePositionReferral")
  //     .withArgs(
  //       owner.address,
  //       ethers.utils.parseUnits(String(100), 18),
  //       0,
  //       codeResult[0],
  //       ethers.constants.AddressZero
  //     );
  // });

  // it("Emit DecreasePositionReferral ", async function () {
  //   let code = ethers.utils.formatBytes32String("des_code");
  //   await setTraderReferralCodeByUser(code);
  //   let codeResult = await getTraderReferralInfo(owner.address);

  //   let params = {
  //     inputs: {
  //       _market: ethers.constants.AddressZero,
  //       _isLong: true,
  //       _oraclePrice: 0,
  //       isOpen: false,
  //       _account: owner.address,
  //       _sizeDelta: ethers.utils.parseUnits(100 + "", 18),
  //       _price: ethers.utils.parseUnits(String(1000), 30),
  //       _slippage: 30,
  //       _isExec: false,
  //       liqState: 0,
  //       _fromOrder: 0,
  //       _refCode: ethers.utils.formatBytes32String("des_code"), //todo
  //       collateralDelta: ethers.utils.parseUnits(100 + "", 18),
  //       execNum: 0,
  //       inputs: [
  //         ethers.utils.parseUnits(String(1200), 30), //tp
  //         ethers.utils.parseUnits(String(900), 30), //sl
  //       ],
  //     },
  //     position: {
  //       market: ethers.constants.AddressZero,
  //       isLong: true,
  //       lastTime: 0,
  //       extra3: 0,
  //       size: 0,
  //       collateral: 0,
  //       averagePrice: 0,
  //       entryFundingRate: 0,
  //       realisedPnl: 0,
  //       extra0: 0,
  //       extra1: 0,
  //       extra2: 0,
  //     },
  //     fees: [0, 0, 0, 0, 0],
  //     collateralToken: ethers.constants.AddressZero,
  //     indexToken: ethers.constants.AddressZero,
  //     collateralDeltaAfter: 0,
  //   };

  //   await expect(updatePositionCallback(params))
  //     .to.be.emit(await readReferral(), "DecreasePositionReferral")
  //     .withArgs(
  //       owner.address,
  //       ethers.utils.parseUnits(String(100), 18),
  //       0,
  //       codeResult[0],
  //       ethers.constants.AddressZero
  //     );
  // });
});
