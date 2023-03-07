const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../goerli_info");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('../../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let treasuryAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');

let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');

//
const adminAddress1 = "0x43700f09B582eE2BFcCe4b5Db40ee41B4649D977" //(Suah)
const adminAddress2 = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea" //(Harvey)
const BONDER = 9;
const STAKER = 10;

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");

    const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);

    // 2. TreasurySetting enable to bonder
    const terasuryContract = new ethers.Contract( treasuryProxyAddress, treasuryAbi.abi, ethers.provider);

    tx = await terasuryContract.connect(deployer).enable(BONDER, bondDepositoryProxyAddress);
    console.log("terasuryContract enable ", BONDER, bondDepositoryProxyAddress );
    await tx.wait();

    const isBonder = await terasuryContract.isBonder(bondDepositoryProxyAddress);
    console.log("terasuryProxyContract isBonder ", isBonder, bondDepositoryProxyAddress);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });