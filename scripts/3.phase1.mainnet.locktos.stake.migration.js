const { ethers, run } = require("hardhat");
const fs = require('fs');
const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");
const {getUniswapInfo} = require("./mainnet_info");

let lockTOSLogic2abi = require('../abis/LockTOSv2Logic0.json');
let stakingV2LogicAbi = require('../abis/StakingV2.json');

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

    // console.log(deployed) ;

    let stosMigrationSet = {
        round: 0,
        batchSize: 100,
        prevStakeId: ethers.BigNumber.from("0"),
        afterStakeId: ethers.BigNumber.from("0"),
        profitZeroLockIds : []
    }

    const stakingProxylogic = new ethers.Contract(deployed.stake, stakingV2LogicAbi.abi, ethers.provider);

    const addLockTosInfos = JSON.parse(await fs.readFileSync("./data/stos-ids-"+stosMigrationBlockNumber+".json"));
    // console.log("addLockTosInfos.ids", addLockTosInfos.ids) ;
    if(addLockTosInfos.ids == null) return;

    stosMigrationSet.prevStakeId = await stakingProxylogic.stakingIdCounter();
    console.log('stosMigrationSet.prevStakeId', stosMigrationSet.prevStakeId.toString())

    save(stosMigrationBlockNumber,{
        name: "prevStakeId",
        address: stosMigrationSet.prevStakeId.toString()
    });

    let batchSize = stosMigrationSet.batchSize;
    let tx;

    let len = addLockTosInfos.ids.length;
    let currentTime = addLockTosInfos.timestamp;
    let ids = addLockTosInfos.ids;
    let accounts = addLockTosInfos.accounts;
    let amounts = addLockTosInfos.amounts;
    let ends = addLockTosInfos.ends;
    let profits = addLockTosInfos.profits;
    console.log('len',len)
    // console.log('currentTime',currentTime)

    let loopCount = Math.floor(len/batchSize)+1;
    let maxRound = loopCount -1;
    console.log('loopCount',loopCount, 'maxRound',maxRound );
    let c = 0;

    // 아래 round 를 하나씩 증가 .
    // for(c = 0; c < loopCount; c++){
    let round = 3;
    if(round <= maxRound){
        c = round;
        let start = c * batchSize;
        let end = start + batchSize;
        if(end > addLockTosInfos.ids.length)  end = addLockTosInfos.ids.length;

        // console.log('start',start)
        // console.log('end',end)

        let idList = [];
        let accountList = [];
        let amountList = [];
        //let profitList = [];
        let endList = [];

        try{
            if(!ids) return;
            if(!accounts) return;
            if(!amounts) return;
            if(!ends) return;
            //if(!profits) return;

            for(let i = start; i < end; i++){
                idList.push(ethers.BigNumber.from(ids[i]));
                accountList.push(accounts[i]);
                amountList.push(ethers.BigNumber.from(amounts[i]));
                //profitList.push(ethers.BigNumber.from(profits[i]));
                endList.push(ethers.BigNumber.from(ends[i]));
            }
            // console.log(c, 'idList',idList)
            // console.log(c, 'accountList',accountList)
            // console.log(c, 'amountList',amountList)
            // console.log(c, 'profitList',profitList)
            console.log('StakeV2.syncStos call ',start, end, 'round', c )
            tx = await stakingProxylogic.connect(deployer).syncStos(
                        accountList,
                        amountList,
                        endList,
                        idList
                    );

            console.log('StakeV2.syncStos end ',start, end, tx.hash)

            await tx.wait();

        }catch(error){
            console.log('StakeV2.syncStos error',c, start, end, error);
            //break;
        }
    }

    stosMigrationSet.afterStakeId = await stakingProxylogic.stakingIdCounter();
    console.log('stosMigrationSet.afterStakeId', stosMigrationSet.afterStakeId.toString())

    save(stosMigrationBlockNumber,{
      name: "afterStakeId",
      address: stosMigrationSet.afterStakeId.toString()
    });

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
