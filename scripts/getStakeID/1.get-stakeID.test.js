const { ethers, upgrades } = require("hardhat");

// const StakeSimpleABI = require("../../abis/StakeSimple.json").abi;
// const Erc20ABI = require("../../abis/erc20ABI.json");
// const SeigManagerABI = require("../../abis/SeigManager.json").abi;
// const DepositManagerABI = require("../../abis/DepositManager.json").abi;

const StakingV2ABI = require("../../artifacts/contracts/StakingV2.sol/StakingV2.json").abi;


const stakeContract1 = "0x9a8294566960Ab244d78D266FFe0f284cDf728F1";
const stakeContract2 = "0x7da4E8Ab0bB29a6772b6231b01ea372994c2A49A";
const stakeContract3 = "0xFC1fC3a05EcdF6B3845391aB5CF6a75aeDef7CeA";
const stakeContract4 = "0x9F97b34161686d60ADB955ed63A2FC0b2eC0a2a9";
const stakeContract5 = "0x21Db1777Dd95749A849d9e244136E72bd93082Ea";

const TON = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
const WTON = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
const TOS = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153";

const Layer2 = "0x42ccf0769e87cb2952634f607df1c7d62e0bbc52";

const SeigManager = "0x710936500aC59e8551331871Cbad3D33d5e0D909";
const DepositManager = "0x56e465f654393fa48f007ed7346105c7195cee43";
const Vault = "0xf04f6a6d6115d8400d18eca99bdee67abb498a7b";

const StakingV2 = "0x14fb0933Ec45ecE75A431D10AFAa1DDF7BfeE44C"

let stakers = [];
let stakeInfos = []

let stakeId = [];
let unstakeId = [];
let remainStakeId = [];

async function main() {

    await getData();

}

async function getData() {
    // const contract = await ethers.getContractAt(StakeSimpleABI, contractAddress, ethers.provider);

    // const TONContract = await ethers.getContractAt(Erc20ABI, TON, ethers.provider);
    // const TOSContract = await ethers.getContractAt(Erc20ABI, TOS, ethers.provider);
    // const WTONContract = await ethers.getContractAt(Erc20ABI, WTON, ethers.provider);
    // const SeigManagerContract = await ethers.getContractAt(SeigManagerABI, SeigManager, ethers.provider);
    // const DepositManagerContract = await ethers.getContractAt(DepositManagerABI, DepositManager, ethers.provider);
    
    const StakingV2Contract = await ethers.getContractAt(StakingV2ABI, StakingV2, ethers.provider);
    console.log("StakingV2Contract : ", StakingV2Contract.address);
    // console.log( 'contract ', contract.address);
    // let balance = await TONContract.balanceOf(contract.address);
    // console.log( 'TON balanceOf ', balance.toString());
    // balance = await TOSContract.balanceOf(contract.address);
    // console.log( 'TOS balanceOf ', balance.toString());
    // balance = await WTONContract.balanceOf(contract.address);
    // console.log( 'WTON balanceOf ', balance.toString());

    // let startBlock = 12880649;
    // let endBlock = 14441730;

    // stakeContract1
    // let startBlock = 12899725;
    // let endBlock = 12991362;

    // stakeContract2   12899725,12991362,
    // let startBlock = 12899725;
    // let endBlock = 12991362;

    let block = await ethers.provider.getBlock('latest')

    // stakeContract3  12899725,12991362,
    // let startBlock = 12899725;
    // let endBlock = 12991362;

    // stakeContract4   12899725,12991362,
    // let startBlock = 12899725;
    // let endBlock = 12991362;

    let stakingIdCounter = 786;

    for(let i = 0; i < stakingIdCounter; i++) {
        let checkBalance = await StakingV2Contract.stakedOf(i)
        if (checkBalance != 0){
            stakeId.push(i)
            // console.log(i)
            if(stakeId.length == 10) {
                console.log(stakeId);
                stakeId = [];
            }
        } else if (checkBalance == 0) {
            unstakeId.push(i)
        }
    }
    
    console.log("----------------------")
    console.log(stakeId)
    console.log("----------------------")
    console.log(unstakeId)

    stakeId = [
        3,  5,  8, 13, 14, 15, 16, 18, 20, 21,
        23, 25, 28, 30, 32, 33, 35, 36, 37, 38,
        39, 41, 43, 44, 45, 46, 48, 56, 57, 61,
        62, 63, 64, 66, 67, 68, 74, 76, 77, 79,
        81, 82, 86, 87, 88, 90, 91, 92, 94, 95,
        97, 101, 102, 103, 106, 107, 109, 113, 115, 116,
        117, 119, 120, 124, 126, 130, 131, 133, 134, 135,
        136, 138, 140, 141, 146, 147, 149, 151, 152, 154,
        156, 158, 160, 161, 162, 163, 165, 168, 172, 174,
        175, 176, 177, 180, 182, 183, 185, 186, 188, 189,
        191, 193, 194, 196, 197, 199, 200, 201, 203, 204,
        205, 213, 217, 218, 220, 222, 223, 224, 229, 230,
        231, 233, 235, 239, 242, 246, 249, 252, 256, 258,
        260, 262, 264, 265, 267, 271, 272, 274, 275, 277,
        279, 281, 283, 284, 286, 288, 289, 291, 294, 296,
        301, 302, 303, 305, 307, 308, 310, 312, 313, 316,
        318, 320, 324, 328, 329, 330, 332, 334, 336, 337,
        338, 340, 341, 343, 344, 346, 347, 349, 351, 352,
        354, 356, 358, 360, 362, 364, 365, 367, 368, 370,
        372, 374, 375, 378, 383, 384, 386, 388, 389, 391,
        393, 395, 403, 406, 407, 409, 411, 415, 417, 419,
        421, 423, 425, 427, 429, 431, 433, 435, 437, 438,
        440, 441, 443, 445, 447, 449, 451, 453, 455, 457,
        459, 461, 463, 465, 466, 467, 468, 469, 470, 471,
        473, 475, 477, 479, 482, 484, 486, 488, 490, 492,
        494, 498, 500, 502, 504, 506, 508, 510, 512, 516,
        518, 520, 522, 523, 524, 525, 527, 529, 531, 533,
        535, 537, 539, 541, 543, 545, 547, 549, 550, 552,
        554, 556, 557, 558, 559, 561, 563, 564, 565, 566,
        567, 691, 692, 693, 694, 696, 705, 729, 736, 737,
        738, 741, 744, 745, 747, 748, 753, 754, 755, 757,
        758, 759, 771, 772, 774, 775, 776, 777, 779, 780,
        782, 785
    ]




    // let startBlock = 15973985;
    // let endBlock = 21134390;

    // let allEvents = [];

    // let eventFilter = [
    //     StakingV2Contract.filters.Staked(null, null, null)
    // ];
    // let txCount = 0;
    // for(let i = startBlock; i < endBlock; i +=5000) {
    //     const _startBlock = i;
    //     const _endBlock = Math.min(endBlock, i + 4999);
    //     const events = await StakingV2Contract.queryFilter(eventFilter, _startBlock, _endBlock);

    //     for(let l=0; l< events.length; l++){
    //         if(events[l].event == "Staked" ){
    //             txCount++;
    //             console.log(events[l].args)
    //             stakeId.push(events[l].args.stakeId)
    //             console.log("----------------------")
    //             console.log(i)
    //             console.log(events[l].args.stakeId)
    //             console.log(events[l].args.to)
    //             console.log("----------------------")
    //         }
    //       }
    // }
    // console.log(stakeId)





    // let eventFilter = [
    //     contract.filters.Staked(null, null)
    //     ];
    // let txCount = 0;
    // for(let i = startBlock; i < endBlock; i += 5000) {
    //   const _startBlock = i;
    //   const _endBlock = Math.min(endBlock, i + 4999);
    //   const events = await contract.queryFilter(eventFilter, _startBlock, _endBlock);
    //   // console.log(events);

    //   for(let l=0; l< events.length; l++){
    //     if(events[l].event == "Staked" ){
    //         txCount++;
    //         let userStaked = await contract.userStaked(events[l].args.to);
    //         let canRewardAmount = await contract.canRewardAmount(events[l].args.to, block.number);
    //         add(events[l].transactionHash, events[l].args.to.toLowerCase(), events[l].args.amount, userStaked.released, canRewardAmount);
    //     }
    //   }
    //   console.log('==== block ', i);
    //   // for(let k=0; k< stakeInfos.length; k++){
    //   //   console.log( k,'    ', stakeInfos[k].account, '    ',stakeInfos[k].amount.toString(),'    ', stakeInfos[k].withdraw,'    ',  stakeInfos[k].canReward.toString());
    //   // }
    //   //allEvents = [...allEvents, ...events]
    // }

    // let sumAmount = ethers.constants.Zero
    // // console.log('==== end block ', i );
    // for(let h=0; h< stakeInfos.length; h++){

    //   if(stakeInfos[h].withdraw == false || stakeInfos[h].canReward.toString() != '0') {
    //     sumAmount = sumAmount.add(stakeInfos[h].amount)
    //     console.log( h,' ', stakeInfos[h].transactionHash, '   ', stakeInfos[h].account, '    ',stakeInfos[h].amount.toString(),'    ', stakeInfos[h].withdraw,'    ',  stakeInfos[h].canReward.toString());
    //   }
    //   // console.log( h,'    ', stakeInfos[h].account, '    ',stakeInfos[h].amount.toString(),'    ', stakeInfos[h].withdraw,'    ',  stakeInfos[h].canReward.toString());
    // }
    // console.log('sumAmount', sumAmount.toString())

    // return null;
  };


  function add(transactionHash, user, amount, withdraw, canReward) {

    if(!stakers.includes(user)) {
       let data = {
          account: user,
          amount: amount,
          withdraw: withdraw,
          canReward: canReward,
          transactionHash: transactionHash
        }
        stakeInfos.push(data);
     } else {
       for(let i=0; i< stakeInfos.length ; i++){
          if(stakeInfos[i].account == user){
            stakeInfos[i].amount = stakeInfos[i].amount.add(amount)
            stakeInfos[i].withdraw = withdraw;
            stakeInfos[i].canReward = canReward;
            stakeInfos[i].transactionHash = transactionHash;
          }
       }
     }
  }


main()
  .then(() => process.exit(0))
  .catch((error) => {

    // for(i=0; i< stakeInfos.length; i++){
    //   console.log( i,' ', stakeInfos[i].transactionHash,'  ', stakeInfos[i].account, '    ',stakeInfos[i].amount.toString(),'    ', stakeInfos[i].withdraw,'    ',  stakeInfos[i].canReward.toString());
    // }

    console.error(error);
    process.exit(1);
  });