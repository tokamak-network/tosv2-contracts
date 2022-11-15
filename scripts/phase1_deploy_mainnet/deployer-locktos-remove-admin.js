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
    // 1. lockTOS의 어드민 권한 삭제
    const lockTosContract = new ethers.Contract(uniswapInfo.lockTOSaddr, LockTOSProxyAbi.abi, ethers.provider);

    const admin_role = "0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42";

    let tx = await lockTosContract.connect(deployer).removeAdmin(
      deployer.address
    )
    console.log("lockTOS grantRole admin_role ", tx.hash);

    await tx.wait();

    // 2. lockTOS의 어드민 권한 확인
    let isAdmin = await lockTosContract.isAdmin(
      deployer.address
    )
    console.log("isAdmin ",  isAdmin);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });