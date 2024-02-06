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
    let foundation2 = "0xBedE575486e1F103fbe258a00D046F09e837fA17"  //TOS DAO
    let foundation3 = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
    let DAOVault = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
    let wtonTosPool = "0x1c0cE9aAA0c12f53Df3B4d8d77B82D6Ad343b4E4"
    let ethTosPool = "0x2AD99c938471770DA0cD60E08eaf29EbfF67a92A"
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
    let ethTosPoolTOS = await TOSContract.balanceOf(ethTosPool);
    let stakeVaultTOS = await TOSContract.balanceOf(StakeVault);
    let tosmining1TOS = await TOSContract.balanceOf(tosmining1);
    let tosmining2TOS = await TOSContract.balanceOf(tosmining2);
    let tosmining3TOS = await TOSContract.balanceOf(tosmining3);
    let tosmining4TOS = await TOSContract.balanceOf(tosmining4);
    let tosmining5TOS = await TOSContract.balanceOf(tosmining5);

    let getTOSAmount = await StakeV2Contract.stakedOfAll();
    let distributeAmount = await TreasuryContract.foundationAmount();

    let totalTOSAmount = await TOSContract.totalSupply();


    let ethTreasury = ethers.utils.formatEther(TreasuryTOS);
    let fixethTreasury = (Math.floor(ethTreasury*100)/100)

    let ethFoundation1 = ethers.utils.formatEther(foundation1TOS);
    let fixethFoundation1 = (Math.floor(ethFoundation1*100)/100)

    let ethFoundation2 = ethers.utils.formatEther(foundation2TOS);
    let fixethFoundation2 = (Math.floor(ethFoundation2*100)/100)

    let ethFoundation3 = ethers.utils.formatEther(foundation3TOS);
    let fixethFoundation3 = (Math.floor(ethFoundation3*100)/100)

    let ethDAOVault = ethers.utils.formatEther(DAOVaultTOS);
    let fixethDAOVault = (Math.floor(ethDAOVault*100)/100)

    let ethwtonTosPoolTOS = ethers.utils.formatEther(wtonTosPoolTOS);
    let fixethwtonTosPoolTOS = (Math.floor(ethwtonTosPoolTOS*100)/100)

    let etherTosPoolTOS = ethers.utils.formatEther(ethTosPoolTOS);
    let fixetherTosPoolTOS = (Math.floor(etherTosPoolTOS*100)/100)

    let ethStakeVaultTOS = ethers.utils.formatEther(stakeVaultTOS);
    let fixethStakeVaultTOS = (Math.floor(ethStakeVaultTOS*100)/100)

    let ethtosmining1TOS = ethers.utils.formatEther(tosmining1TOS);
    let fixethtosmining1TOS = (Math.floor(ethtosmining1TOS*100)/100)

    let ethtosmining2TOS = ethers.utils.formatEther(tosmining2TOS);
    let fixethtosmining2TOS = (Math.floor(ethtosmining2TOS*100)/100)

    let ethtosmining3TOS = ethers.utils.formatEther(tosmining3TOS);
    let fixethtosmining3TOS = (Math.floor(ethtosmining3TOS*100)/100)

    let ethtosmining4TOS = ethers.utils.formatEther(tosmining4TOS);
    let fixethtosmining4TOS = (Math.floor(ethtosmining4TOS*100)/100)

    let ethtosmining5TOS = ethers.utils.formatEther(tosmining5TOS);
    let fixethtosmining5TOS = (Math.floor(ethtosmining5TOS*100)/100)

    let ethgetTOSAmount = ethers.utils.formatEther(getTOSAmount);
    let fixethgetTOSAmount = (Math.floor(ethgetTOSAmount*100)/100)

    let ethdistributeAmount =  ethers.utils.formatEther(distributeAmount);
    let fixethdistributeAmount = (Math.floor(ethdistributeAmount*100)/100)

    let ethtotalTOSAmount = ethers.utils.formatEther(totalTOSAmount);
    // let fixethtotalTOSAmount = (Math.floor(ethtotalTOSAmount*100)/100)
    

    console.log("Treasury TOS blanaces :", fixethTreasury, " TOS, ", (Math.floor(ethTreasury/ethtotalTOSAmount*100*100)/100), "%");
    console.log("Foundation1 TOS blanaces :", fixethFoundation1, " TOS, ", (Math.floor(ethFoundation1/ethtotalTOSAmount*100*100)/100), "%");
    console.log("Foundation2 TOS blanaces :", fixethFoundation2, " TOS, ", (Math.floor(ethFoundation2/ethtotalTOSAmount*100*100)/100), "%");
    console.log("Foundation3 TOS blanaces :", fixethFoundation3, " TOS, ", (Math.floor(ethFoundation3/ethtotalTOSAmount*100*100)/100), "%");
    console.log("DAOVault TOS blanaces :", fixethDAOVault, " TOS, ", (Math.floor(ethDAOVault/ethtotalTOSAmount*100*100)/100), "%");
    console.log("WTON-TOS Pool TOS blanaces :", fixethwtonTosPoolTOS, " TOS, ", (Math.floor(ethwtonTosPoolTOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("ETH-TOS Pool TOS blanaces :", fixetherTosPoolTOS, " TOS, ", (Math.floor(etherTosPoolTOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("StakeVault TOS blanaces :", fixethStakeVaultTOS, " TOS, ", (Math.floor(ethStakeVaultTOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("TOSMining1 TOS blanaces :", fixethtosmining1TOS, " TOS, ", (Math.floor(ethtosmining1TOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("TOSMining2 TOS blanaces :", fixethtosmining2TOS, " TOS, ", (Math.floor(ethtosmining2TOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("TOSMining3 TOS blanaces :", fixethtosmining3TOS, " TOS, ", (Math.floor(ethtosmining3TOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("TOSMining4 TOS blanaces :", fixethtosmining4TOS, " TOS, ", (Math.floor(ethtosmining4TOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("TOSMining5 TOS blanaces :", fixethtosmining5TOS, " TOS, ", (Math.floor(ethtosmining5TOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("refund StakeTOSAmount TOS blanaces :", fixethgetTOSAmount, " TOS, ", (Math.floor(ethgetTOSAmount/ethtotalTOSAmount*100*100)/100), "%");
    console.log("distributeAmount TOS blanaces :", fixethdistributeAmount, " TOS, ", (Math.floor(ethdistributeAmount/ethtotalTOSAmount*100*100)/100), "%");

    let tokamakTreasuryTOS = Number(ethTreasury) - Number(ethgetTOSAmount)
    let fixtokamakTreasuryTOS = (Math.floor(tokamakTreasuryTOS*100)/100)
    
    let tokamakFoundationTOS = Number(ethFoundation1) + Number(ethFoundation2) + Number(ethFoundation3)
    let fixtokamakFoundationTOS = (Math.floor(tokamakFoundationTOS*100)/100)

    let tokamakTotalTOS = Number(tokamakTreasuryTOS) + Number(tokamakFoundationTOS) + Number(ethDAOVault) + Number(ethwtonTosPoolTOS) + Number(etherTosPoolTOS)
    let fixtokamakTotalTOS = (Math.floor(tokamakTotalTOS*100)/100)

    console.log("tokamakTreasury TOS blanaces :", fixtokamakTreasuryTOS, " TOS, ", (Math.floor(tokamakTreasuryTOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("tokamakFoundationTOS TOS blanaces :", fixtokamakFoundationTOS, " TOS, ", (Math.floor(tokamakFoundationTOS/ethtotalTOSAmount*100*100)/100), "%");
    console.log("tokamakTotalTOS TOS blanaces :", fixtokamakTotalTOS, " TOS, ", (Math.floor(tokamakTotalTOS/ethtotalTOSAmount*100*100)/100), "%");

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });