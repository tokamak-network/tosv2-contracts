const fs = require('fs');
// const { ethers } = require('hardhat');
let treasuryLogicAbi = require('../abis/Treasury.json');
let stakingV2LogicAbi = require('../abis/StakingV2.json');


task("create-eth-market", "Create Market")
    .addParam("bondDepositoryAddress", "BondDepository Address")
    .addParam("capacity", "TOS capacity")
    .addParam("endTime", "End Time")
    .addParam("maxPayout", "TOS maxPayout")
    .addParam("tosPrice", "TOS Price")
    .setAction(async ({
        bondDepositoryAddress, capacity, endTime, maxPayout, tosPrice}) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);

        console.log("bondDepositoryAddress: ", bondDepositoryAddress);
        console.log("capacity: ", capacity);
        console.log("endTime: ", endTime);
        console.log("maxPayout: ", maxPayout);
        console.log("tosPrice: ", tosPrice);


        let bondDepositoryLogicAbi = require('../artifacts/contracts/BondDepository.sol/BondDepository.json');

        const bondDepositoryContract = await ethers.getContractAt(
            bondDepositoryLogicAbi.abi,
            bondDepositoryAddress
        );
        try {
            console.log("bondDepositoryContract: " );
            let tx = await bondDepositoryContract.connect(deployer).create(
                ethers.constants.AddressZero,
                [capacity, endTime, tosPrice, maxPayout]
            );

            await tx.wait();

            console.log("create: ", tx.hash);
        } catch(err) {
            console.log("err: ", err);
        }

        let marketList = await bondDepositoryContract["getMarketList()"]();
        console.log("marketList", marketList);
    })