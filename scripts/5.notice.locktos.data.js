const { ethers, run } = require("hardhat");
const fs = require('fs');

const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");
const {getUniswapInfo} = require("./mainnet_info");

const exportUsersToExcel = require('./exportExcel');

let lockTOSLogic2abi = require('../abis/LockTOSv2Logic0.json');
let stakingV2LogicAbi = require('../abis/StakingV2.json');

function containsNumber(a, obj) {
    var i = a.length;
    while (i--) {
        //console.log(a[i].toNumber(), obj.toNumber());
       if (a[i].toNumber() === obj.toNumber()) {
           return true;
       }
    }
    return false;
  }

async function main() {
    const accountSigners = await ethers.getSigners();
    const deployer = accountSigners[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config, stosMigrationBlockNumber} = await getUniswapInfo();

    // const calculatorContract = new ethers.Contract( tosCalculatorAddress, calculatorAbi.abi, ethers.provider);

    let deployed = {
        treasury: "",
        stake: "",
        bond: ""
    }

    deployed.treasury = loadDeployed(stosMigrationBlockNumber, "TreasuryProxy");
    deployed.stake = loadDeployed(stosMigrationBlockNumber, "StakingV2Proxy");
    deployed.bond = loadDeployed(stosMigrationBlockNumber, "BondDepositoryProxy");

    const lockTOS = new ethers.Contract(uniswapInfo.lockTOSaddr, lockTOSLogic2abi.abi, ethers.provider);

    lockTOS.defaultBlock = Number(stosMigrationBlockNumber);
    console.log("prev defaultBlock ", lockTOS.defaultBlock );

    let stosHolders = await lockTOS.allHolders();
    //console.log('stosHolders',stosHolders);

    let outs = {
        accountList : [],
        datas : []
    };

    let datas = [];
    // let data = {
    //     "Account": '',
    //     "BEFORE_TOS": '',
    //     "BEFORE_STOS": '',
    //     "AFTER_TOS": '',
    //     "AFTER_STOS": ''
    //     };

    for(let i=0; i< stosHolders.length; i++){
        let account = stosHolders[i].toLowerCase();
        let stosBalance = await lockTOS.balanceOf(account);
        let userLocks = await lockTOS.locksOf(account);
        let tosDeposit = ethers.BigNumber.from("0");
        // console.log("userLocks",   account, userLocks );

        for (let j=0; j < userLocks.length; j++) {
            let deposit = await lockTOS.locksInfo(userLocks[j]);
            // console.log(j, ": ", userLocks[j], deposit );
            tosDeposit = tosDeposit.add(deposit.amount);
        }

        let data = {
            "Account": account,
            "BEFORE_TOS": tosDeposit.toString()+'',
            "BEFORE_STOS": stosBalance.toString()+'',
            "AFTER_TOS": '',
            "AFTER_STOS": ''
        };

        outs.accountList.push(account);
        outs[account] = data;
        console.log(i,account, data );
    }

    //-----------------------------------
    lockTOS.defaultBlock = 0;
    console.log("after " );


    let stosHoldersAfter = await lockTOS.allHolders();
    for(let i=0; i< stosHoldersAfter.length; i++){
        let account = stosHoldersAfter[i].toLowerCase();
        let stosBalance = await lockTOS.balanceOf(account);
        let userLocks = await lockTOS.locksOf(account);
        let tosDeposit = ethers.BigNumber.from("0");

        for (let j=0; j < userLocks.length; j++) {
            let deposit = await lockTOS.locksInfo(userLocks[j]);
            // console.log(j, ":", userLocks[j], deposit );
            tosDeposit = tosDeposit.add(deposit.amount);
        }

        if (outs[account] != null){
            outs[account].AFTER_TOS = tosDeposit.toString()+'';
            outs[account].AFTER_STOS = stosBalance.toString()+'';
        } else {
            let data = {
                "Account": account,
                "BEFORE_TOS": '',
                "BEFORE_STOS": '',
                "AFTER_TOS": tosDeposit.toString()+'',
                "AFTER_STOS": stosBalance.toString()+''
            };

            outs.accountList.push(account);
            outs[account] = data;
        }

        console.log(i,account, outs[account]);
        outs.datas.push(outs[account]);
    }

    //-----------------------------------
    const workSheetColumnName = [
        "Account",
        "BEFORE_TOS",
        "BEFORE_STOS",
        "AFTER_TOS",
        "AFTER_STOS"
    ];

    const workSheetName = 'STOS_Migration';
    const filePath = './outputFile/sros-migration-data.xlsx';

    exportUsersToExcel(outs.datas, workSheetColumnName, workSheetName, filePath);

    console.log('stos holder length : ', outs.datas.length);

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
