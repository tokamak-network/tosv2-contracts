const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");
const utils = ethers.utils;

const { toBN, keccak256 } = require("web3-utils");

const {encodeFunctionSignature}  = require("web3-eth-abi")

require("dotenv").config();

const ProxyABI = require("../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json").abi
const TreasuryABI = require("../../artifacts/contracts/TreasuryV1_1.sol/TreasuryV1_1.json").abi
const TSOABI = require("../../abis/TOS.json").abi

const tester_address = "0xc1eba383D94c6021160042491A5dfaF1d82694E6"

// // sepolia
// const info = {
//     TOS: "0xff3ef745d9878afe5934ff0b130868afddbc58e8",
//     treasuryProxy: '0xFD7C2c54a0A755a46793A91449806A4b14E3eEe8',
//     claimableStartTime : ethers.BigNumber.from('1722409200'),
//     claimPause: false,
// }

// mainnet
const info = {
  TOS: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
  treasuryProxy: '0xD27A68a457005f822863199Af0F817f672588ad6',
  claimableStartTime : ethers.BigNumber.from('1722409200'),
  claimPause: false,
}


async function test() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = deployer.address

    await hre.ethers.provider.send("hardhat_impersonateAccount",[tester_address]);
    await hre.ethers.provider.send("hardhat_setBalance", [
      tester_address,
      "0x8ac7230489e80000",
    ]);
    const tester = await ethers.getSigner(tester_address);

    const treasury = await ethers.getContractAt(
        TreasuryABI,
        info.treasuryProxy,
        deployer
    );

    const tos = await ethers.getContractAt(
        TSOABI,
        info.TOS,
        deployer
    );

    let claimPause = await treasury.claimPause()
    console.log('claimPause ', claimPause)

    let claimableStartTime = await treasury.claimableStartTime()
    console.log('claimableStartTime ', claimableStartTime)

    let claimableEther = await treasury.claimableEther(ethers.utils.parseEther("1"))
    console.log('claimableEther ',ethers.utils.formatEther(claimableEther) )

    let tosBalancePrev = await tos.balanceOf(tester_address)
    let ethBalancePrev = await tester.getBalance()

    const receipt = await (await treasury.connect(tester).claim(ethers.utils.parseEther("1"))).wait()
    // console.log('receipt ', receipt)

    let tosBalanceAfter = await tos.balanceOf(tester_address)
    let ethBalanceAfter = await tester.getBalance()

    console.log('tos Diff ', ethers.utils.formatEther(tosBalanceAfter.sub(tosBalancePrev)))
    console.log('eth Diff ', ethers.utils.formatEther(ethBalanceAfter.sub(ethBalancePrev)))

    return null;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  await test(deployer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
