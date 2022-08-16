const { ethers, run } = require("hardhat");
const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");

let treasuryLogicAbi = require('./../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('./../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('./../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('./../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('./../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let bondDepositoryProxyAbi = require('./../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('./../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');


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

let overdepositAmount = ethers.utils.parseUnits("1", 15);     //over deposit상황

//rinkeby
// let lockTOSaddr = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568"
let lockTOSaddr = "0x89F137913Eb8214A2c91e71009438415BBEF0fD6"

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

    
    // const tosCalculatorAddress = "0xBc67b71Fe9180d163b8819df2D1245267A54fF99"
    // const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = "0x78937BA043c568EdAA895F6e818661b6Ca37Ba80";
    const bondDepositoryProxyAddress = "0xBFaD7C13a43e62502eFb7d181278CB483A9BA34b";

    // const calculatorContract = new ethers.Contract( tosCalculatorAddress, calculatorAbi.abi, ethers.provider);

    // const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);

    const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2ProxyAbi.abi, ethers.provider);
    const stakingProxyContract2 = new ethers.Contract( stakingProxyAddress, stakingV2LogicAbi.abi, ethers.provider);
    
    // const bondProxyContract = new ethers.Contract( bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);
    const bondProxyContract2 = new ethers.Contract( bondDepositoryProxyAddress, bondDepositoryLogicAbi.abi, ethers.provider);

    // let tx = await bondProxyContract2.connect(deployer).ETHDeposit(
    //     0,
    //     overdepositAmount,
    //     {value: overdepositAmount} 
    // )

    tx = await stakingProxyContract2.possibleIndex();
    console.log(Number(tx));


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });