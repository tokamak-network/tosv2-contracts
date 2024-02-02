const { ethers, run } = require("hardhat");

let tosABI = require("../../abis/TOS.json");


async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby"; 

    //mainnet
    let TOSAddr = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153"
    let TreasuryAddr = "0xD27A68a457005f822863199Af0F817f672588ad6"
    
    const TOSContract = new ethers.Contract( TOSAddr, tosABI.abi, ethers.provider);

    let TreasuryTOS = await TOSContract.balanceOf(TreasuryAddr);
    console.log("Treasury TOS blanaces :", TreasuryTOS);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });