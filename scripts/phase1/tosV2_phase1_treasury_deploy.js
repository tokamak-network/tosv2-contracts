const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const { printGasUsedOfUnits } = require("../log_tx");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby"; 

    let deployInfo = {
        name: "",
        address: ""
    }

    const LibTreasury = await ethers.getContractFactory("LibTreasury");
    let libTreasury = await LibTreasury.connect(deployer).deploy();

    deployInfo = {
      name: "LibTreasury",
      address: libTreasury.address
    }
    
    save(networkName, deployInfo);

    const treasuryLogic = await (await ethers.getContractFactory("Treasury", {
      libraries: {
        LibTreasury: libTreasury.address
      }
    })).connect(deployer).deploy();

    let tx = await treasuryLogic.deployed();
    console.log("treasuryLogic: ", treasuryLogic.address);

    deployInfo = {
        name: "Treasury",
        address: treasuryLogic.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('treasuryLogic Deploy',tx);


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

    printGasUsedOfUnits('treasuryProxy Deploy',tx);


    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: treasuryLogic.address,
        constructorArgsParams: [],
      });
    }

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: treasuryProxy.address,
        constructorArgsParams: [],
      });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });