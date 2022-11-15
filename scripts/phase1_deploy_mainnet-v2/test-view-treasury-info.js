const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');

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

    const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);
    let tos = await terasuryProxyContract.connect(deployer).tos();
    console.log("tos ", tos);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });