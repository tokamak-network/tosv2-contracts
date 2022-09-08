const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('../../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');


//goerli :
let rinkeby_address = {
  poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  wton: "",
  tos: "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9",
  weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  tosethPool: "0x3b466f5d9b49aedd65f6124d5986a9f30b1f5442",
  wtonWethPool: "",
  wtonTosPool: "",
  tosDOCPool: ""
}

let lockTOSaddr = "0x63689448AbEaaDb57342D9e0E9B5535894C35433"

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby";
    if(chainId == 5) networkName = "goerli";

    const tosCalculatorAddress = loadDeployed(networkName, "TOSValueCalculator");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    const calculatorContract = new ethers.Contract( tosCalculatorAddress, calculatorAbi.abi, ethers.provider);

    await calculatorContract.connect(deployer).initialize(
        rinkeby_address.tos,
        rinkeby_address.weth,
        rinkeby_address.npm,
        rinkeby_address.tosethPool,
        rinkeby_address.poolfactory
    )
    console.log("tosCalculator initialized");

    const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);

    await terasuryProxyContract.connect(deployer).initialize(
      rinkeby_address.tos,
      tosCalculatorAddress,
      rinkeby_address.weth,
      rinkeby_address.poolfactory,
      stakingProxyAddress,
      rinkeby_address.tosethPool
    )

    console.log("treasury initialized");

    const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2ProxyAbi.abi, ethers.provider);

    const block = await ethers.provider.getBlock('latest')

    // let epochLength = 3600 * 8;
    let epochLength = 600;
    let epochEnd = Number(block.timestamp) + Number(epochLength);
    // let basicBondPeriod = (86400*5);
    let basicBondPeriod = 1800;

    await stakingProxyContract.connect(deployer).initialize(
      rinkeby_address.tos,
      [epochLength,epochEnd],
      lockTOSaddr,
      treasuryProxyAddress,
      basicBondPeriod
    )
    console.log("StakingV2 initialized");

    const bondProxyContract = new ethers.Contract( bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);

    await bondProxyContract.connect(deployer).initialize(
      rinkeby_address.tos,
      stakingProxyAddress,
      treasuryProxyAddress,
      tosCalculatorAddress,
      rinkeby_address.poolfactory
    )

    console.log("bondDepository initialized");

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });