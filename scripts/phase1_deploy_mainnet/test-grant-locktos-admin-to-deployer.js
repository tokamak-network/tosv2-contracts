const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let LockTOSProxyAbi = require('../../abis/LockTOSProxy.json');

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    //=========
    const lockTosAdmin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";

    await hre.ethers.provider.send("hardhat_impersonateAccount",[lockTosAdmin]);
    let adminLockTos = await ethers.getSigner(lockTosAdmin);

    const lockTosContract = new ethers.Contract(uniswapInfo.lockTOSaddr, LockTOSProxyAbi.abi, ethers.provider);

    const admin_role = "0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42";

    let tx = await lockTosContract.connect(adminLockTos).grantRole(
      admin_role,
      deployer.address
    )
    console.log("grantRole admin_role ", tx.hash);

    await tx.wait();


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });