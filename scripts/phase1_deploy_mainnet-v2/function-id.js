const { ethers, run } = require("hardhat");
const Web3EthAbi = require("web3-eth-abi");

const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let BondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');

async function main() {

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();


    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");
    const bondDepositoryContract = new ethers.Contract(bondDepositoryProxyAddress, BondDepositoryProxyAbi.abi, ethers.provider);


    const _ETHDeposit = Web3EthAbi.encodeFunctionSignature(
        "ETHDeposit(uint256,uint256)"
      );

    console.log("ETHDeposit(uint256,uint256), ", _ETHDeposit );

    const _withdrawEther = Web3EthAbi.encodeFunctionSignature(
        "withdrawEther(address)"
      );

    console.log("withdrawEther(address), ", _withdrawEther );


    // const tx1 = await bondDepositoryContract.connect(
    //     tonstarterAdmin
    //   ).setSelectorImplementations2(
    //     [
    //         _ETHDeposit
    //     ],
    //     "0x0000000000000000000000000000000000000001");


    // await tx1.wait();


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });