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
    // 1. lockTOS의 tos를 treasury로 전송
    const lockTosContract = new ethers.Contract(uniswapInfo.lockTOSaddr, LockTOSProxyAbi.abi, ethers.provider);

    let tx = await lockTosContract.connect(deployer).transferTosToTreasury(
      treasuryProxyAddress
    )

    console.log("lockTOS transferTosToTreasury ", treasuryProxyAddress, tx.hash);

    await tx.wait();

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });