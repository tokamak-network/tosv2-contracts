const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let tosAbi = require('../../abis/TOS.json');

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    //=========
    const tosAdmin = "0x12A936026F072d4e97047696A9d11F97Eae47d21";

    await hre.ethers.provider.send("hardhat_impersonateAccount",[tosAdmin]);
    let adminTos = await ethers.getSigner(tosAdmin);

    //console.log('tosAbi.abi',tosAbi.abi)
    const tosContract = new ethers.Contract( uniswapInfo.tos, tosAbi.abi, ethers.provider);
    //console.log('tosContract',tosContract)
    const minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";
    const burn_role = "0x9667e80708b6eeeb0053fa0cca44e028ff548e2a9f029edfeac87c118b08b7c8";

    let tx = await tosContract.connect(adminTos).grantRole(
        minter_role,
        treasuryProxyAddress
    )
    console.log("grantRole minter_role ", tx.hash);

    await tx.wait();


    let tx1 = await tosContract.connect(adminTos).grantRole(
        burn_role,
        treasuryProxyAddress
    )
    console.log("grantRole burn_role ", tx1.hash);

    await tx1.wait();

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });