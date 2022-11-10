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

    let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');

    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    //bondDepository Deploy
    const bondLogic = await (await ethers.getContractFactory("BondDepository")).connect(deployer).deploy();

    tx = await bondLogic.deployed();

    console.log("bondLogic: ", bondLogic.address);

    deployInfo = {
        name: "BondDepository",
        address: bondLogic.address
    }

    save(networkName, deployInfo);

    // printGasUsedOfUnits('stakingLogic Deploy', chainId, tx);


    //bondDepositoryProxy
    const bondDepositoryProxyContract = new ethers.Contract(bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);
    await bondDepositoryProxyContract.connect(deployer).upgradeTo(bondLogic.address);

    console.log("bondDepositoryProxy: upgradeTo ", bondLogic.address);


    if(chainId == 1 || chainId == 4 || chainId == 5) {
      await run("verify", {
        address: bondLogic.address,
        constructorArgsParams: [],
      });
    }

    console.log("bondLogic verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });