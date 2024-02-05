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
    let foundation1 = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1"
    let foundation2 = "0xBedE575486e1F103fbe258a00D046F09e837fA17"
    let foundation3 = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
    
    const TOSContract = new ethers.Contract( TOSAddr, tosABI.abi, ethers.provider);

    let TreasuryTOS = await TOSContract.balanceOf(TreasuryAddr);
    let foundation1TOS = await TOSContract.balanceOf(foundation1);
    let foundation2TOS = await TOSContract.balanceOf(foundation2);
    let foundation3TOS = await TOSContract.balanceOf(foundation3);
    let ethTreasury = ethers.utils.formatEther(TreasuryTOS);
    let ethFoundation1 = ethers.utils.formatEther(foundation1TOS);
    let ethFoundation2 = ethers.utils.formatEther(foundation2TOS);
    let ethFoundation3 = ethers.utils.formatEther(foundation3TOS);
    

    console.log("Treasury TOS blanaces :", ethTreasury, " TOS");
    console.log("Foundation1 TOS blanaces :", ethFoundation1, " TOS");
    console.log("Foundation2 TOS blanaces :", ethFoundation2, " TOS");
    console.log("Foundation3 TOS blanaces :", ethFoundation3, " TOS");

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });