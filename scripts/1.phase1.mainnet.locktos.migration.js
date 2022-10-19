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

  let stosMigrationSet = {
    adminAddress : config.adminAddress,
    round: 0,
    batchSize: 100,
    prevStakeId: ethers.BigNumber.from("0"),
    afterStakeId: ethers.BigNumber.from("0"),
    profitZeroLockIds : []
  }

  deployed.treasury = loadDeployed(stosMigrationBlockNumber, "TreasuryProxy");
  deployed.stake = loadDeployed(stosMigrationBlockNumber, "StakingV2Proxy");
  deployed.bond = loadDeployed(stosMigrationBlockNumber, "BondDepositoryProxy");

  const lockTosContract = new ethers.Contract(uniswapInfo.lockTOSaddr, lockTOSLogic2abi.abi, ethers.provider);
  // console.log("lockTosContract ", lockTosContract.address);

  const addLockTosInfos = JSON.parse(await fs.readFileSync("./data/stos-ids-"+stosMigrationBlockNumber+".json"));
  if(addLockTosInfos.ids == null) return;
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
  console.log('currentTime',currentTime)

  let loopCount = Math.floor(len/batchSize)+1;
  let maxRound = loopCount -1;
  console.log('loopCount',loopCount, 'maxRound',maxRound );

  let c = 0;

  // for(c = 0; c < loopCount; c++){

  // 아래 라운드를 0부터 순차적으로 실행. 트랜잭션이 끝나는 것 확인 후 다음 라운드 실행하자.
  let round = 0;
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
    let profitList = [];

    try{
        if(!ids) return;
        if(!accounts) return;
        if(!amounts) return;
        if(!ends) return;
        if(!profits) return;

        for (let i = start; i < end; i++) {
            idList.push(ethers.BigNumber.from(ids[i]));
            accountList.push(accounts[i]);
            amountList.push(ethers.BigNumber.from(amounts[i]));
            profitList.push(ethers.BigNumber.from(profits[i]));
        }
        // console.log(c, 'idList',idList)
        // console.log(c, 'accountList',accountList)
        // console.log(c, 'amountList',amountList)
        // console.log(c, 'profitList',profitList)
        console.log('LockTOS.increaseLockTOSAmounts call ',start, end, 'round', c )
        tx = await lockTosContract.connect(deployer).increaseAmountOfIds(
                    accountList,
                    idList,
                    profitList,
                    currentTime
                );

        console.log('LockTOS.increaseLockTOSAmounts end ',start, end, tx.hash)

        await tx.wait();

    }catch(error){
      console.log('LockTOS.increaseLockTOSAmounts error',c, start, end, error);
      //break;
    }

  }

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
