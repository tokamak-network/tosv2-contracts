const { ethers, run } = require("hardhat");
const fs = require('fs');
const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");
const {getUniswapInfo} = require("./mainnet_info");

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

    // console.log(deployed) ;

    let stosMigrationSet = {
        round: 0,
        batchSize: 100,
        prevStakeId: ethers.BigNumber.from("0"),
        afterStakeId: ethers.BigNumber.from("0"),
        profitZeroLockIds : []
    }

    const lockTosContract = new ethers.Contract(uniswapInfo.lockTOSaddr, lockTOSLogic2abi.abi, ethers.provider);

    const stakingProxylogic = new ethers.Contract(deployed.stake, stakingV2LogicAbi.abi, ethers.provider);

    const addLockTosInfos = JSON.parse(await fs.readFileSync("./data/stos-ids-"+stosMigrationBlockNumber+".json"));
    // console.log("addLockTosInfos.ids", addLockTosInfos.ids) ;
    if(addLockTosInfos.ids == null) return;

    stosMigrationSet.profitZeroLockIds = loadDeployed(stosMigrationBlockNumber, "profitZeroLockIds");
    stosMigrationSet.prevStakeId = loadDeployed(stosMigrationBlockNumber, "prevStakeId");
    stosMigrationSet.prevStakeId = ethers.BigNumber.from(stosMigrationSet.prevStakeId);

    stosMigrationSet.afterStakeId = loadDeployed(stosMigrationBlockNumber, "afterStakeId");
    stosMigrationSet.afterStakeId = ethers.BigNumber.from(stosMigrationSet.afterStakeId);

    console.log('stosMigrationSet.profitZeroLockIds',stosMigrationSet.profitZeroLockIds);
    console.log('stosMigrationSet.prevStakeId',stosMigrationSet.prevStakeId);
    console.log('stosMigrationSet.afterStakeId',stosMigrationSet.afterStakeId);

    let len = addLockTosInfos.ids.length;

    let start = stosMigrationSet.prevStakeId.add(ethers.constants.One).toNumber();
    let end = stosMigrationSet.afterStakeId.toNumber();
    console.log('start', start);
    console.log('end', end);
    let count = 0;
    try{
    // if(!ids) return;
    // if(!accounts) return;
    // if(!amounts) return;
    // if(!ends) return;
    // if(!profits) return;

        for(let i = start; i <= end; i++){

            let stakeId = ethers.BigNumber.from(i+"");
            let lockId = await stakingProxylogic.connectId(stakeId);

            if(lockId.gt(ethers.constants.Zero)){
                count++;

                let stakeInfo = await stakingProxylogic.stakeInfo(stakeId);
                let lockTosInfo = await lockTosContract.allLocks(lockId);
                let userLocks = await lockTosContract.locksOf(stakeInfo.staker);
                let includeUserLocks = containsNumber(userLocks, lockId);
                let includeProfitZero = stosMigrationSet.profitZeroLockIds.includes(lockId.toNumber());

                // console.log(lockId, 'includeUserLocks ', includeUserLocks, "includeProfitZero ", includeProfitZero );

                // if (!includeUserLocks || includeProfitZero ) {
                //   console.log('--- check --- ');
                //   console.log('includeUserLocks',includeUserLocks);
                //   console.log('includeProfitZero',includeProfitZero);
                //   console.log('stakeId',stakeId);
                //   console.log('stakeInfo',stakeInfo);
                //   console.log('lockId',lockId);
                //   console.log('lockTosInfo',lockTosInfo);
                //   console.log('userLocks',userLocks);
                // }

                // expect(includeUserLocks).to.eq(true);
                if ( includeUserLocks != true ) {
                    console.log('** error  사용자 아이디리스트에 lockId가 없다.  => lockId ', lockId, 'userLocks', userLocks, 'staker',stakeInfo.staker );
                }
                if (includeProfitZero) {
                    if (!(stakeInfo.deposit.eq(lockTosInfo.amount))) {
                        console.log('** error profit 이 0인데, deposit과 locktos 원금과 다르다.  => lockId ', lockId, 'userLocks', userLocks, 'staker',stakeInfo.staker );
                    }
                } else {
                    if (stakeInfo.deposit.gte(lockTosInfo.amount)) {
                        console.log('**error iprofit 이 0보다 큰데, deposit이 locktos 원금보다 작다. => lockId ', lockId, 'userLocks', userLocks, 'staker',stakeInfo.staker );
                    }
                }
            }
        }

        if (count != len) {
            console.log('**error count 와 len 이 다르다. count ',count, 'len',len);
        }


    }catch(error){
        console.log('check the staked amount: error', start, end, error);
    }

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
