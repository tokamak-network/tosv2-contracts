const { ethers, run } = require("hardhat");


let lockTOSLogic2abi = require('../../abis/LockTOSv2Logic0.json');
let stakingV2LogicAbi = require('../../abis/StakingV2.json');
let treasuryLogicAbi = require('../../abis/Treasury.json');
let tosAbi = require('../../abis/TOS.json');

async function main() {
  const accountSigners = await ethers.getSigners();
  const deployer = accountSigners[0];
  console.log("deployer: ", deployer.address);

  const StakingV2Proxy = "0x14fb0933Ec45ecE75A431D10AFAa1DDF7BfeE44C"
  const TreasuryProxy = "0xD27A68a457005f822863199Af0F817f672588ad6"
  const LockTOSProxy = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
  const TOSaddress = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153"

  const Stakingv2 = new ethers.Contract(StakingV2Proxy, stakingV2LogicAbi.abi, ethers.provider);
  const Treasury = new ethers.Contract(TreasuryProxy, treasuryLogicAbi.abi, ethers.provider);
  const LockTOS = new ethers.Contract(LockTOSProxy, lockTOSLogic2abi.abi, ethers.provider);
  const TOS = new ethers.Contract(TOSaddress, tosAbi.abi, ethers.provider);

  let totalLtos = await Stakingv2.totalLtos();
  console.log("totalLtos", totalLtos.toString());

  let possibleIndex = await Stakingv2.possibleIndex();
  console.log("possibleIndex", possibleIndex.toString());

  let enableStaking = await Treasury.enableStaking();
  console.log("enableStaking", enableStaking.toString());

  let sTosTotalSupply = await LockTOS.totalSupply();
  console.log("sTosTotalSupply", sTosTotalSupply.toString());


  let balanceEth =  await ethers.provider.getBalance(TreasuryProxy);
  console.log('balanceEth', balanceEth.toString());
//   console.log('balanceEth',ethers.utils.formatUnits(balanceEth,18), "ETH");

  let tosTotalSupply = await TOS.totalSupply();
  console.log("tosTotalSupply", tosTotalSupply.toString());

  // Stakingv2.possibleIndex()
  // Treasury.enableStaking
  // StakingV2.epoch.length()
  // Stakingv2.rebasePerEpoch()
  // sTOS supply
  // Treasury ETH supply


}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
