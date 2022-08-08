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


//rinkeby
let rinkeby_address = {
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    wton: "0x709bef48982Bbfd6F2D4Be24660832665F53406C",
    tos: "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd",
    weth: "0xc778417e063141139fce010982780140aa0cd5ab",
    tosethPool: "0x7715dF692fb4031DC51C53b35eFC2b65d9e752c0",
    wtonWethPool: "0xE032a3aEc591fF1Ca88122928161eA1053a098AC",
    wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
    tosDOCPool: "0x831a1f01ce17b6123a7d1ea65c26783539747d6d"
}

//rinkeby
let lockTOSaddr = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568"

//mainnet
// let lockTOSaddr = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby"; 

    
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
    let epochNumber = 0;
    let epochEnd = Number(block.timestamp) + Number(epochLength);
    // let basicBondPeriod = (86400*5);
    let basicBondPeriod = 1800;

    await stakingProxyContract.connect(deployer).initialize(
      rinkeby_address.tos,
      [epochLength,epochNumber,epochEnd],
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