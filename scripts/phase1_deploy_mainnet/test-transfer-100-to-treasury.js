const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");


async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");


    await hre.ethers.provider.send("hardhat_setBalance", [
      deployer.address,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);

    let balanceEthPrev =  await ethers.provider.getBalance(treasuryProxyAddress);
    console.log('balanceEthPrev',ethers.utils.formatUnits(balanceEthPrev,18), "ETH");

    let amount = ethers.utils.parseEther("100");

    let transaction = {
      to: treasuryProxyAddress,
      from: deployer.address,
      data: "0x",
      value:amount
    }

    await deployer.sendTransaction( transaction );

    let balanceEthAfter =  await ethers.provider.getBalance(treasuryProxyAddress);
    console.log('balanceEthAfter',ethers.utils.formatUnits(balanceEthAfter,18), "ETH");

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });