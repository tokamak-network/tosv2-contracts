const { ethers } = require("hardhat");


  async function indexEpochPassMonth() {
    let passTime =   60 * 60 * 24 * 30;
    ethers.provider.send("evm_increaseTime", [passTime])
    ethers.provider.send("evm_mine")
  }

  async function indexEpochPass(_stakingProxylogic, passNextEpochCount) {
      let block = await ethers.provider.getBlock();
      let epochInfo = await _stakingProxylogic.epoch();
      let passTime =  epochInfo.end - block.timestamp + (epochInfo.length_ * passNextEpochCount) + 60;
      ethers.provider.send("evm_increaseTime", [passTime])
      ethers.provider.send("evm_mine")
  }


  async function sendEthToTreasury(admin1, treasuryProxylogic, amount) {
    let transaction = {
      to: treasuryProxylogic.address,
      from: admin1.address,
      data: "0x",
      value: amount
    }
    await admin1.sendTransaction( transaction );
  }


  async function logStatus(str, treasuryProxylogic, stakingProxylogic, tosContract, foundations) {
    console.log('----- '+str+' ------- ');

    let getIndex = await stakingProxylogic.getIndex();
    console.log('getIndex', getIndex);

    let balanceOf = await tosContract.balanceOf(treasuryProxylogic.address);
    console.log('TOS.balanceOf(treasury)', ethers.utils.formatEther(balanceOf));

    let enableStaking = await treasuryProxylogic.enableStaking();
    console.log('treasuryProxylogic enableStaking', ethers.utils.formatEther(enableStaking));

    let runwayTos = await stakingProxylogic.runwayTos();
    console.log('runwayTos', ethers.utils.formatEther(runwayTos));

    let totalSupply = await tosContract.totalSupply();
    console.log('Total TOS Supply',  ethers.utils.formatEther(totalSupply) , "TOS");

    let stakingPrincipal = await stakingProxylogic.stakingPrincipal();
    console.log('stakingPrincipal', ethers.utils.formatEther(stakingPrincipal));

    let totalLtos = await stakingProxylogic.totalLtos();
    console.log('totalLtos', ethers.utils.formatEther(totalLtos));

    let getLtosToTos = await stakingProxylogic.getLtosToTos(totalLtos);
    console.log('getLtosToTos', ethers.utils.formatEther(getLtosToTos));

    for (let k = 0; k < foundations.length; k++){
      let foundationBalance = await tosContract.balanceOf(foundations.address[k]);
      console.log('foundation TOS Balance', k, foundations.address[k], ethers.utils.formatEther(foundationBalance));
    }

    console.log('-----  possibleIndex ------- ');
    let possibleIndex = await stakingProxylogic.possibleIndex();
    console.log('possibleIndex', possibleIndex);

    let runwayTosPossibleIndex = await stakingProxylogic.runwayTosPossibleIndex();
    console.log('runwayTosPossibleIndex', ethers.utils.formatEther(runwayTosPossibleIndex));

    let getLtosToTosPossibleIndex = await stakingProxylogic.getLtosToTosPossibleIndex(totalLtos);
    console.log('getLtosToTosPossibleIndex', ethers.utils.formatEther(getLtosToTosPossibleIndex));

    let reward = getLtosToTosPossibleIndex.sub(stakingPrincipal);
    console.log('reward', ethers.utils.formatEther(reward));

  }

module.exports = {
    indexEpochPassMonth,
    indexEpochPass,
    sendEthToTreasury,
    logStatus,
}