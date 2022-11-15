const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let LockTOSProxyAbi = require('../../abis/LockTOSProxy.json');
let LockTOSv2ProxyAbi = require('../../abis/LockTOSv2Proxy.json');
let LockTOSv2Logic0Abi = require('../../abis/LockTOSv2Logic0.json');
let TreasuryAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');


async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");
    const LockTOSv2Proxy = loadDeployed(networkName, "LockTOSv2Proxy");
    const LockTOSv2Logic0 = loadDeployed(networkName, "LockTOSv2Logic0");

    // mainnet
    const foundationAddress = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";
    const tosDaoAddress = "0xBedE575486e1F103fbe258a00D046F09e837fA17";
    const tonDaoAddress = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303";

    const foundationPercentage = ethers.BigNumber.from("1500");
    const tosDaoPercentage = ethers.BigNumber.from("500");
    const tonDaoPercentage = ethers.BigNumber.from("100");

    const _address = [foundationAddress, tosDaoAddress, tonDaoAddress ]
    const _percents = [
      foundationPercentage,
      tosDaoPercentage,
      tonDaoPercentage
    ]

    const treasuryProxyContract = new ethers.Contract(treasuryProxyAddress, TreasuryAbi.abi, ethers.provider);
    let tx = await treasuryProxyContract.connect(deployer).setFoundationDistributeInfo(
      _address, _percents
    );
    await tx.wait();
    console.log("TreasuryProxy setFoundationDistributeInfo ", tx.hash);


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });