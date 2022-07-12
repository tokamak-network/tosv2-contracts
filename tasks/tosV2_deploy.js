const fs = require('fs');
// const { ethers } = require('hardhat');
let treasuryLogicAbi = require('../abis/Treasury.json');
let stakingV2LogicAbi = require('../abis/StakingV2.json');


task("deploy-tos-v2", "Deploy TOSV2")
    .addParam("lockTosAddress", "LockTOS Address")
    .addParam("tosAddress", "TOS Address")
    .addParam("adminAddress", "admin Address")
    .setAction(async ({ lockTosAddress,tosAddress,adminAddress }) => {
        const { RINKEBY_PRIVATE_KEY: account } = process.env;

        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);

        // await hre.network.provider.send('hardhat_impersonateAccount',[adminAddress]);
        // await hre.network.provider.send('hardhat_setBalance',[adminAddress, "0x10000000000000000000000000"]);
        // let admin = await hre.ethers.getSigner(adminAddress) ;
        // console.log("admin : ", admin.address);

        await hre.ethers.provider.send("hardhat_setBalance", [
            deployer.address,
            "0x8ac7230489e80000",
          ]);


        const treasuryLogic = await (await ethers.getContractFactory("Treasury"))
            .connect(deployer)
            .deploy();

        await treasuryLogic.deployed();

        console.log("treasuryLogic: ", treasuryLogic.address);
        const tresuyLogicAddress = treasuryLogic.address;

        const treasuryProxy = await (await ethers.getContractFactory("TreasuryProxy"))
            .connect(deployer)
            .deploy();
        await treasuryProxy.deployed();

        console.log("treasuryProxy: ", treasuryProxy.address);
        const treasuryProxyAddrress = treasuryProxy.address;

        const treasuryProxyContract = new ethers.Contract( treasuryProxyAddrress, treasuryLogicAbi.abi, ethers.provider);

        const stakingLogic = await (await ethers.getContractFactory("StakingV2"))
            .connect(deployer)
            .deploy();
        await stakingLogic.deployed();

        console.log("stakingLogic: ", stakingLogic.address);
        const stakingLogicAddress = stakingLogic.address;

        const stakingProxy = await ( await ethers.getContractFactory("StakingV2Proxy"))
            .connect(deployer)
            .deploy();
        await stakingProxy.deployed();

        console.log("stakingProxy: ", stakingProxy.address);
        const stakingProxyAddress = stakingProxy.address;
        
        const block = await ethers.provider.getBlock('latest')
        const epochLength = 20;
        const epochUnit = 60;
        const firstEpochNumber = 0;

        const firstEndEpochTime = block.timestamp + epochLength;
        await stakingProxy.connect(deployer).initialize(
            tosAddress,
            [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
            lockTosAddress,
            treasuryProxyAddrress
        )

        const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2LogicAbi.abi, ethers.provider);
        console.log("stakingProxyContract : ", stakingProxyContract.address);
    })