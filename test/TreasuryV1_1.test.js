// const { expect } = require("chai");
const { ethers } = require("hardhat");

const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect } = chai;
chai.use(solidity);
require("chai").should();

let tosabi = require('../abis/TOS.json');

let treasuryV1_1Abi = require('../artifacts/contracts/TreasuryV1_1.sol/TreasuryV1_1.json');

let treasuryProxyAbi = require('../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');

let tosAddress = '0x409c4D8cd5d2924b9bc5509230d16a61289c8153'
let adminAddress = '0x15280a52e79fd4ab35f4b9acbb376dcd72b44fd1'
let policyAddress = '0x15280a52e79fd4ab35f4b9acbb376dcd72b44fd1'
let testerAddress = '0xf1f290bd78a924b7309aa1dc4d6a51be1f69174e'


let adminAccount, policyAccount, testerAccount
let treasuryV1_1Contract
let treasuryContract , treasuryProxyContract
let tosContract
// mainnet
let treasuryProxyaddress = "0xD27A68a457005f822863199Af0F817f672588ad6"
let LibTreasury = "0x2c77067900f1544345552f0A12d0bDf4EaE6fE04";

describe("TreasuryV1_1", function () {

  before(async () => {
    accounts = await ethers.getSigners();
    [admin1 ] = accounts;
    await hre.ethers.provider.send("hardhat_impersonateAccount",[adminAddress]);
    await hre.ethers.provider.send("hardhat_impersonateAccount",[policyAddress]);
    await hre.ethers.provider.send("hardhat_impersonateAccount",[testerAddress]);

    await hre.ethers.provider.send("hardhat_setBalance", [
      admin1.address,
      "0x8ac7230489e80000",
    ]);

    await hre.ethers.provider.send("hardhat_setBalance", [
        adminAddress,
        "0x8ac7230489e80000",
    ]);
    await hre.ethers.provider.send("hardhat_setBalance", [
        policyAddress,
        "0x8ac7230489e80000",
    ]);
    await hre.ethers.provider.send("hardhat_setBalance", [
        testerAddress,
        "0x8ac7230489e80000",
    ]);
    adminAccount = await ethers.getSigner(adminAddress);
    policyAccount = await ethers.getSigner(policyAddress);
    testerAccount = await ethers.getSigner(testerAddress);

    tosContract = await ethers.getContractAt(tosabi.abi, tosAddress, ethers.provider)
  });

  describe("TreasuryV1_1", () => {
    it("Deploy TreasuryV1_1 Logic", async () => {

        let dep = await ethers.getContractFactory("TreasuryV1_1", {
            libraries: {
              LibTreasury: LibTreasury
            }
          })

        treasuryV1_1Contract = await dep.connect(admin1).deploy();
        await treasuryV1_1Contract.deployed();
    })

    it("upgradeTo", async () => {
        treasuryProxyContract = await ethers.getContractAt(treasuryProxyAbi.abi, treasuryProxyaddress, ethers.provider)

        await (await treasuryProxyContract.connect(adminAccount).upgradeTo(treasuryV1_1Contract.address)).wait()
        treasuryContract = await ethers.getContractAt(treasuryV1_1Abi.abi, treasuryProxyaddress, admin1)
    })

    it("setClaimPause : only PolicyOwner can execute function. ", async () => {

        expect(await treasuryContract.claimPause()).to.be.eq(false)

        await expect(
            treasuryContract.connect(admin1).setClaimPause(true)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
    })

    it("setClaimPause : only PolicyOwner can execute function. ", async () => {

        expect(await treasuryContract.claimPause()).to.be.eq(false)

        await (await treasuryContract.connect(policyAccount).setClaimPause(true)).wait()

        expect(await treasuryContract.claimPause()).to.be.eq(true)

    })

    it("setClaimableStartTime : only PolicyOwner can execute function. ", async () => {

        let block = await ethers.provider.getBlock('latest')

        expect(await treasuryContract.claimableStartTime()).to.be.eq(ethers.constants.Zero)

        await expect(
            treasuryContract.connect(admin1).setClaimableStartTime(block.timestamp + 1000)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
    })

    it("setClaimableStartTime : only PolicyOwner can execute function. ", async () => {

        let block = await ethers.provider.getBlock('latest')
        let stime = block.timestamp + 100

        expect(await treasuryContract.claimableStartTime()).to.be.eq(ethers.constants.Zero)
        await (await treasuryContract.connect(policyAccount).setClaimableStartTime(stime)).wait()
        expect(await treasuryContract.claimableStartTime()).to.be.eq(stime)

    })

    // it("claim : TOS burn permission is required for treasury ", async () => {
        // expect(await tosContract.isBurner(treasuryContract.address)).to.be.eq(false)

        // let amount = ethers.utils.parseEther("10")

        // await expect(
        //     treasuryContract.connect(testerAccount).claim(amount)
        // ).to.be.revertedWith("AccessiblePlusCommon: Caller is not a burner")

    // })

    it("claim : paused  ", async () => {
        expect(await treasuryContract.claimPause()).to.be.eq(true)

        let amount = ethers.utils.parseEther("10")

        await expect(
            treasuryContract.connect(testerAccount).claim(amount)
        ).to.be.revertedWith("paused")

    })

    it("setClaimPause : only PolicyOwner can execute function. ", async () => {

        expect(await treasuryContract.claimPause()).to.be.eq(true)

        await (await treasuryContract.connect(policyAccount).setClaimPause(false)).wait()

        expect(await treasuryContract.claimPause()).to.be.eq(false)

    })

    it("setClaimableStartTime : only PolicyOwner can execute function. ", async () => {

        await (await treasuryContract.connect(policyAccount).setClaimableStartTime(ethers.constants.Zero)).wait()
        expect(await treasuryContract.claimableStartTime()).to.be.eq(ethers.constants.Zero)

    })

    it("claim : none claimable time  ", async () => {
        expect(await treasuryContract.claimPause()).to.be.eq(false)
        expect(await treasuryContract.claimableStartTime()).to.be.eq(ethers.constants.Zero)

        let amount = ethers.utils.parseEther("10")

        await expect(
            treasuryContract.connect(testerAccount).claim(amount)
        ).to.be.revertedWith("none claimable time")

    })

    it("setClaimableStartTime : only PolicyOwner can execute function. ", async () => {

        let block = await ethers.provider.getBlock('latest')
        let stime = block.timestamp + 12

        await (await treasuryContract.connect(policyAccount).setClaimableStartTime(stime)).wait()
        expect(await treasuryContract.claimableStartTime()).to.be.eq(stime)

    })

    it("claim   ", async () => {
        expect(await treasuryContract.claimPause()).to.be.eq(false)
        expect(await treasuryContract.claimableStartTime()).to.be.gt(ethers.constants.Zero)

        expect(
            await treasuryContract.claimableEther(ethers.utils.parseEther("1"))
        ).to.be.eq(
            await treasuryContract.backingRateETHPerTOS()
        )
        //0.000073199678367128

        let amount = ethers.utils.parseEther("1000")

        let passTime =  60*60*24 ;
        ethers.provider.send("evm_increaseTime", [passTime])
        ethers.provider.send("evm_mine")

        let claimableEther = await treasuryContract.claimableEther(amount)
        expect(claimableEther).to.be.gt(ethers.constants.Zero)

        let totalSupplyTosBeforeClaim = await tosContract.totalSupply()
        let ethBalanceBefore = await testerAccount.getBalance()
        let ethBalanceBeforeTreasury = await ethers.provider.getBalance(treasuryContract.address);

        const topic = treasuryContract.interface.getEventTopic('Claimed');
        const receipt = await (await treasuryContract.connect(testerAccount).claim(amount)).wait()
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);

        const deployedEvent = treasuryContract.interface.parseLog(log);
        expect(deployedEvent.args.account).to.be.eq(testerAccount.address)
        expect(deployedEvent.args.tosAmount).to.be.eq(amount)
        expect(deployedEvent.args.ethAmount).to.be.eq(claimableEther)

        expect(await tosContract.totalSupply()).to.be.eq(totalSupplyTosBeforeClaim.sub(amount))

        let ethBalanceAfter = await testerAccount.getBalance()
        let ethBalanceAfterTreasury = await ethers.provider.getBalance(treasuryContract.address);

        expect(ethBalanceAfterTreasury).to.be.eq(ethBalanceBeforeTreasury.sub(claimableEther))
        // expect(ethBalanceAfter).to.be.lt(ethBalanceBefore.add(claimableEther))
        // expect(ethBalanceAfter).to.be.gt(ethBalanceBefore)

    })

  })


});
