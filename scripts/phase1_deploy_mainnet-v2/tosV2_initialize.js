const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('../../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const tosCalculatorAddress = loadDeployed(networkName, "TOSValueCalculator");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    // const calculatorContract = new ethers.Contract( tosCalculatorAddress, calculatorAbi.abi, ethers.provider);

    // await calculatorContract.connect(deployer).initialize(
    //   uniswapInfo.tos,
    //   uniswapInfo.weth,
    //   uniswapInfo.npm,
    //   uniswapInfo.tosethPool,
    //   uniswapInfo.poolfactory
    // )
    // console.log("tosCalculator initialized");

    const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);

    await terasuryProxyContract.connect(deployer).initialize(
      uniswapInfo.tos,
      tosCalculatorAddress,
      uniswapInfo.weth,
      uniswapInfo.poolfactory,
      stakingProxyAddress,
      uniswapInfo.tosethPool
    )

    console.log("treasury initialized");

    const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2ProxyAbi.abi, ethers.provider);

    // const block = await ethers.provider.getBlock('latest')

    await stakingProxyContract.connect(deployer).initialize(
      uniswapInfo.tos,
      [config.epochLength, config.epochEnd],
      uniswapInfo.lockTOSaddr,
      treasuryProxyAddress,
      config.basicBondPeriod
    )
    console.log("StakingV2 initialized");

    const bondProxyContract = new ethers.Contract( bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);

    await bondProxyContract.connect(deployer).initialize(
      uniswapInfo.tos,
      stakingProxyAddress,
      treasuryProxyAddress,
      tosCalculatorAddress,
      uniswapInfo.poolfactory
    )

    console.log("bondDepository initialized");

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });