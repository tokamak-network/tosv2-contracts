const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const { printGasUsedOfUnits } = require("../log_tx");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby";
    if(chainId == 5) networkName = "goerli";

    let deployInfo = {
        name: "",
        address: ""
    }

    let uniswapPoolFactory = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

    // OracleLibrary Deploy
    const oracleLibrary = loadDeployed(networkName, "OracleLibrary");
    const bondDepositoryV1_5 = loadDeployed(networkName, "BondDepositoryV1_5");


    //bondDepositoryProxy
    let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
    let bondDepositoryAbi = require('../../artifacts/contracts/BondDepositoryV1_5.sol/BondDepositoryV1_5.json');

    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    const bondDepositoryProxyContract = new ethers.Contract(bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);
    let tx1 =await bondDepositoryProxyContract.connect(deployer).upgradeTo(bondDepositoryV1_5);

    console.log("bondDepositoryProxy: upgradeTo ", bondDepositoryV1_5);
    await tx1.wait();

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });