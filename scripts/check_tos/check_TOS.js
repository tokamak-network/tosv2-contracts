const { ethers, run } = require("hardhat");

let tosABI = require("../../abis/TOS.json");
let treasuryLogicABI = require("../../abis/Treasury.json");
let stakeLogicABI = require("../../abis/StakingV2.json");


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
    let StakeAddr = "0x14fb0933Ec45ecE75A431D10AFAa1DDF7BfeE44C"
    let foundation1 = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1"
    let foundation2 = "0xBedE575486e1F103fbe258a00D046F09e837fA17"
    let foundation3 = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
    let DAOVault = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
    let wtonTosPool = "0x1c0cE9aAA0c12f53Df3B4d8d77B82D6Ad343b4E4"
    let StakeVault = "0xf04f6A6D6115D8400D18ECa99BdEe67ABB498a7B"
    let tosmining1 = "0x21Db1777Dd95749A849d9e244136E72bd93082Ea"
    let tosmining2 = "0x9F97b34161686d60ADB955ed63A2FC0b2eC0a2a9"
    let tosmining3 = "0xFC1fC3a05EcdF6B3845391aB5CF6a75aeDef7CeA"
    let tosmining4 = "0x7da4E8Ab0bB29a6772b6231b01ea372994c2A49A"
    let tosmining5 = "0x9a8294566960Ab244d78D266FFe0f284cDf728F1"
    
    const TOSContract = new ethers.Contract( TOSAddr, tosABI.abi, ethers.provider );
    const TreasuryContract = new ethers.Contract( TreasuryAddr, treasuryLogicABI.abi, ethers.provider );
    const StakeV2Contract = new ethers.Contract( StakeAddr, stakeLogicABI.abi, ethers.provider );

    let TreasuryTOS = await TOSContract.balanceOf(TreasuryAddr);
    let foundation1TOS = await TOSContract.balanceOf(foundation1);
    let foundation2TOS = await TOSContract.balanceOf(foundation2);
    let foundation3TOS = await TOSContract.balanceOf(foundation3);
    let DAOVaultTOS = await TOSContract.balanceOf(DAOVault);
    let wtonTosPoolTOS = await TOSContract.balanceOf(wtonTosPool);
    let stakeVaultTOS = await TOSContract.balanceOf(StakeVault);
    let tosmining1TOS = await TOSContract.balanceOf(tosmining1);
    let tosmining2TOS = await TOSContract.balanceOf(tosmining2);
    let tosmining3TOS = await TOSContract.balanceOf(tosmining3);
    let tosmining4TOS = await TOSContract.balanceOf(tosmining4);
    let tosmining5TOS = await TOSContract.balanceOf(tosmining5);

    let getTOSAmount = await StakeV2Contract.stakedOfAll();
    let distributeAmount = await TreasuryContract.foundationAmount();


    let ethTreasury = ethers.utils.formatEther(TreasuryTOS);
    let ethFoundation1 = ethers.utils.formatEther(foundation1TOS);
    let ethFoundation2 = ethers.utils.formatEther(foundation2TOS);
    let ethFoundation3 = ethers.utils.formatEther(foundation3TOS);
    let ethDAOVault = ethers.utils.formatEther(DAOVaultTOS);
    let ethwtonTosPoolTOS = ethers.utils.formatEther(wtonTosPoolTOS);
    let ethStakeVaultTOS = ethers.utils.formatEther(stakeVaultTOS);
    let ethtosmining1TOS = ethers.utils.formatEther(tosmining1TOS);
    let ethtosmining2TOS = ethers.utils.formatEther(tosmining2TOS);
    let ethtosmining3TOS = ethers.utils.formatEther(tosmining3TOS);
    let ethtosmining4TOS = ethers.utils.formatEther(tosmining4TOS);
    let ethtosmining5TOS = ethers.utils.formatEther(tosmining5TOS);
    let ethgetTOSAmount = ethers.utils.formatEther(getTOSAmount);
    let ethdistributeAmount =  ethers.utils.formatEther(distributeAmount);
    

    console.log("Treasury TOS blanaces :", ethTreasury, " TOS");
    console.log("Foundation1 TOS blanaces :", ethFoundation1, " TOS");
    console.log("Foundation2 TOS blanaces :", ethFoundation2, " TOS");
    console.log("Foundation3 TOS blanaces :", ethFoundation3, " TOS");
    console.log("DAOVault TOS blanaces :", ethDAOVault, " TOS");
    console.log("WTON-TOS Pool TOS blanaces :", ethwtonTosPoolTOS, " TOS");
    console.log("StakeVault TOS blanaces :", ethStakeVaultTOS, " TOS");
    console.log("TOSMining1 TOS blanaces :", ethtosmining1TOS, " TOS");
    console.log("TOSMining2 TOS blanaces :", ethtosmining2TOS, " TOS");
    console.log("TOSMining3 TOS blanaces :", ethtosmining3TOS, " TOS");
    console.log("TOSMining4 TOS blanaces :", ethtosmining4TOS, " TOS");
    console.log("TOSMining5 TOS blanaces :", ethtosmining5TOS, " TOS");
    console.log("refund StakeTOSAmount TOS blanaces :", ethgetTOSAmount, " TOS");
    console.log("distributeAmount TOS blanaces :", ethdistributeAmount, " TOS");

    let tokamakTreasuryTOS = Number(ethTreasury) - Number(ethgetTOSAmount)
    let tokamakFoundationTOS = Number(ethFoundation1) + Number(ethFoundation2) + Number(ethFoundation3)
    let tokamakTotalTOS = Number(tokamakTreasuryTOS) + Number(tokamakFoundationTOS) + Number(ethDAOVault) + Number(ethwtonTosPoolTOS)

    console.log("tokamakTreasury TOS blanaces :", tokamakTreasuryTOS, " TOS");
    console.log("tokamakFoundationTOS TOS blanaces :", tokamakFoundationTOS, " TOS");
    console.log("tokamakTotalTOS TOS blanaces :", tokamakTotalTOS, " TOS");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });