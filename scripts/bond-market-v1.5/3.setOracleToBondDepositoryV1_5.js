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
    let oracleLibrary, bondDepositoryV1_5

    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");
    const oracleLibraryAddress = loadDeployed(networkName, "OracleLibrary");

    //bondDepositoryProxy
    let bondDepositoryAbi = require('../../artifacts/contracts/BondDepositoryV1_5.sol/BondDepositoryV1_5.json');

    const bondDepositoryContract = new ethers.Contract(bondDepositoryProxyAddress, bondDepositoryAbi.abi, ethers.provider);
    let tx = await bondDepositoryContract.connect(deployer).changeOracleLibrary(
      oracleLibraryAddress,
      uniswapPoolFactory
    );
    console.log("bondDepository: changeOracleLibrary ", tx.hash);

    await tx.wait();

    let tx1 = await bondDepositoryContract.connect(deployer).changeRemainingTosTolerance(
      ethers.utils.parseEther("100")
    );
    console.log("bondDepository: changeRemainingTosTolerance ", tx1.hash);
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