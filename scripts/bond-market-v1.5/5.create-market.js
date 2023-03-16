const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const { printGasUsedOfUnits } = require("../log_tx");
const { FeeAmount, encodePath } = require("./utils");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby";
    if(chainId == 5) networkName = "goerli";

    let weth = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
    let wton = "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6";
    let tos = "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9";

    let BondDepositoryProxyAddress = "0x5A2BAb6Eb7bC97b8832e6951D6E4f614C074d45c"
    let bondInfo = {
        marketId : null,
        check: true,
        token: ethers.constants.AddressZero,
        market: {
          startTime: 0,
          closeTime: 1669852800,
          capacity: ethers.BigNumber.from("200000000000000000000000"),
          lowerPriceLimit: ethers.BigNumber.from("2316841458170000000000"),
          capacityUpdatePeriod: 60*60*1,
          salePeriod : 60*60*24*7*1,
          pathes : [
            encodePath(
              [weth, tos],
              [FeeAmount.MEDIUM]
            ),
            encodePath(
              [weth, wton, tos],
              [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
            )
          ]
        },
        stakeId: 0,
        tosValuation: 0,
        mintAmount: 0,
        stosId: 0
      }

    const BondDepositoryV1_5ABI = require('../../artifacts/contracts/BondDepositoryV1_5.sol/BondDepositoryV1_5.json');
    const block = await ethers.provider.getBlock('latest')
    bondInfo.market.startTime = block.timestamp + (60*5);
    bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

    console.log('bondInfo', bondInfo);

    const bondDepository = new ethers.Contract(BondDepositoryProxyAddress, BondDepositoryV1_5ABI.abi, ethers.provider);
    let tx = await bondDepository.connect(deployer).create(
        bondInfo.token,
        [
          bondInfo.market.capacity,
          bondInfo.market.lowerPriceLimit,
          bondInfo.market.capacityUpdatePeriod
        ],
        '0xbe8808548c8e1179435448fB621EC5A7A60c178D',
        ethers.constants.One,
        bondInfo.market.startTime,
        bondInfo.market.closeTime,
        bondInfo.market.pathes
      )

    console.log('tx', tx);
    await tx.wait();

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });