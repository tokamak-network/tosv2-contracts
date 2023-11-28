const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");

const { printGasUsedOfUnits } = require("../log_tx");
const {getUniswapInfo} = require("../holesky_info");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName  } = await getUniswapInfo();

    let deployInfo = {
        name: "",
        address: ""
    }

    //LibTreasury deploy
    const LibTreasury = await ethers.getContractFactory("LibTreasury");
    let libTreasury = await LibTreasury.connect(deployer).deploy();
    let tx = await libTreasury.deployed();

    console.log("libTreasury: ", libTreasury.address);

    deployInfo = {
      name: "LibTreasury",
      address: libTreasury.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('LibTreasury Deploy', chainId, tx);

    //Treasury Deploy

    const treasuryLogic = await (await ethers.getContractFactory("Treasury", {
      libraries: {
        LibTreasury: libTreasury.address
      }
    })).connect(deployer).deploy();



    tx = await treasuryLogic.deployed();
    console.log("treasuryLogic: ", treasuryLogic.address);

    deployInfo = {
        name: "Treasury",
        address: treasuryLogic.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('treasuryLogic Deploy', chainId, tx);


    //TreasuryProxy Deploy
    const treasuryProxy = await (await ethers.getContractFactory("TreasuryProxy"))
        .connect(deployer)
        .deploy();
    tx = await treasuryProxy.deployed();

    await treasuryProxy.connect(deployer).upgradeTo(treasuryLogic.address);

    console.log("treasuryProxy: ", treasuryProxy.address);

    deployInfo = {
      name: "TreasuryProxy",
      address: treasuryProxy.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('treasuryProxy Deploy', chainId, tx);


    if(chainId == 1 || chainId == 4 || chainId == 5 || chainId == 17000) {
      await run("verify", {
        address: libTreasury.address,
        constructorArgsParams: [],
      });
    }

    console.log("libTreasury verified");


    if(chainId == 1 || chainId == 4 || chainId == 5 || chainId == 17000) {
      await run("verify", {
        address: treasuryLogic.address,
        constructorArgsParams: [],
      });
    }

    console.log("treasuryLogic verified");

    if(chainId == 1 || chainId == 4 || chainId == 5 || chainId == 17000) {
      await run("verify", {
        address: treasuryProxy.address,
        constructorArgsParams: [],
      });
    }

    console.log("treasuryProxy verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });