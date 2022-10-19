const { ethers, run } = require("hardhat");
const fs = require('fs');
const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");
const {getUniswapInfo} = require("./mainnet_info");

let lockTOSLogic2abi = require('../abis/LockTOSv2Logic0.json');

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

    let stosMigrationSet = {
        round: 0,
        batchSize: 100,
        prevStakeId: ethers.BigNumber.from("0"),
        afterStakeId: ethers.BigNumber.from("0"),
        profitZeroLockIds : []
    }

    const lockTosContract = new ethers.Contract(uniswapInfo.lockTOSaddr, lockTOSLogic2abi.abi, ethers.provider);

    const addLockTosInfos = JSON.parse(await fs.readFileSync("./data/stos-ids-"+stosMigrationBlockNumber+".json"));
    if(addLockTosInfos.ids == null) return;

    let len = addLockTosInfos.ids.length;
    let currentTime = addLockTosInfos.timestamp;
    let ids = addLockTosInfos.ids;
    let accounts = addLockTosInfos.accounts;
    let amounts = addLockTosInfos.amounts;
    let ends = addLockTosInfos.ends;
    let profits = addLockTosInfos.profits;
    // console.log('len',len)

    let start = 0;
    let end = addLockTosInfos.ids.length;
    try{
        if(!ids) return;
        if(!accounts) return;
        if(!amounts) return;
        if(!ends) return;
        if(!profits) return;
        stosMigrationSet.profitZeroLockIds = [];

        for(let i = start; i < end; i++){

            let id = ethers.BigNumber.from(ids[i]);
            let amount = ethers.BigNumber.from(amounts[i]);
            let profit = profits[i];
            let lockTosInfo = await lockTosContract.locksInfo(id);

            if(profit != "0"){
                // expect(lockTosInfo.amount).to.be.gt(amount);

                if(lockTosInfo.amount.gt(amount)) {
                    //console.log('ok ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString() );
                } else {
                    console.log('wrong ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString());
                }
            } else {
                // console.log('profit zero id ', id.toNumber());
                // console.log('amount',amount) ;
                // console.log('profit',profit) ;
                // console.log('lockTosInfo',lockTosInfo) ;
                stosMigrationSet.profitZeroLockIds.push(id.toNumber());

                // expect(lockTosInfo.amount).to.be.eq(amount);
                if(lockTosInfo.amount.eq(amount)) {
                    //console.log('ok ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString() );
                } else {
                    console.log('wrong ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString());
                }
            }
        }
        console.log('profitZeroLockIds 이미 종료되었는데, 언스테이킹을 하지 않음. ', stosMigrationSet.profitZeroLockIds);

        save(stosMigrationBlockNumber,{
            name: "profitZeroLockIds",
            address: stosMigrationSet.profitZeroLockIds
        });

    }catch(error){
        console.log('compareStakeAnfLockTOSAmounts error', start, end, error);
    }

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
