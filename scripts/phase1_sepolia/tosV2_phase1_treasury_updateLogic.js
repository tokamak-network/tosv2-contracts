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

  let treasuryV2ProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');

  const LibTreasuryAddress = loadDeployed(networkName, "LibTreasury");
  const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");

  //Treasury Deploy
  const treasuryLogic = await (await ethers.getContractFactory("Treasury", {
    libraries: {
      LibTreasury: LibTreasuryAddress
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

  //TreasuryProxy
  const treasuryProxyContract = new ethers.Contract(treasuryProxyAddress, treasuryV2ProxyAbi.abi, ethers.provider);
  await treasuryProxyContract.connect(deployer).upgradeTo(treasuryLogic.address);

  const treasuryProxy = await (await ethers.getContractFactory("TreasuryProxy"))
      .connect(deployer)
      .deploy();
  tx = await treasuryProxy.deployed();

  await treasuryProxy.connect(deployer).upgradeTo(treasuryLogic.address);

  console.log("treasuryProxy:upgradeTo: ", treasuryLogic.address);


  if(chainId == 1 || chainId == 4 || chainId == 5 || chainId == 11155111) {
    await run("verify", {
      address: treasuryLogic.address,
      constructorArgsParams: [],
    });
  }

  console.log("treasuryLogic verified");


}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });