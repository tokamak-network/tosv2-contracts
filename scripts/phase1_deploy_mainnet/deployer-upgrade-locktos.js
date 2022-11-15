const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let LockTOSProxyAbi = require('../../abis/LockTOSProxy.json');
let LockTOSv2ProxyAbi = require('../../abis/LockTOSv2Proxy.json');
let LockTOSv2Logic0Abi = require('../../abis/LockTOSv2Logic0.json');

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

    // const lockTosAdmin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";

    // await hre.ethers.provider.send("hardhat_impersonateAccount",[lockTosAdmin]);
    // let adminLockTos = await ethers.getSigner(lockTosAdmin);

    const lockTosContract = new ethers.Contract(uniswapInfo.lockTOSaddr, LockTOSProxyAbi.abi, ethers.provider);
    let tx = await lockTosContract.connect(deployer).upgradeTo(LockTOSv2Proxy);
    await tx.wait();
    console.log("lockTosContract upgradeTo ", tx.hash);


    const lockTosProxyContract = new ethers.Contract(uniswapInfo.lockTOSaddr, LockTOSv2ProxyAbi.abi, ethers.provider);
    let tx1 = await lockTosProxyContract.connect(deployer).setImplementation2(LockTOSv2Logic0, 0, true);
    await tx1.wait();
    console.log("lockTosContract setImplementation2 ", tx1.hash);



    const lockToslogicContract = new ethers.Contract(uniswapInfo.lockTOSaddr, LockTOSv2Logic0Abi.abi, ethers.provider);
    let tx2 = await lockToslogicContract.connect(deployer).setStaker(stakingProxyAddress);
    await tx2.wait();
    console.log("lockTosContract setStaker ", tx2.hash);


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });