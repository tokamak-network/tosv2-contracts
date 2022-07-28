const fs = require('fs');
// const { ethers } = require('hardhat');
let treasuryLogicAbi = require('../abis/Treasury.json');
let stakingV2LogicAbi = require('../abis/StakingV2.json');
const { ethers } = require('ethers');


task("deploy-tos-v2", "Deploy TOSV2")
    .addParam("lockTosAddress", "LockTOS Address")
    .addParam("tosAddress", "TOS Address")
    .addParam("wethAddress", "WETH Address")
    .addParam("tosWethPoolAddress", "TOSWETH Address")
    .setAction(async ({ lockTosAddress,tosAddress,wethAddress,tosWethPoolAddress }) => {
        const { RINKEBY_PRIVATE_KEY: account } = process.env;

        const npmAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
        const uniswapFactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
        
        //TOSCalculator
        //1. tosAddress
        //2. wethAddress
        //3. npmAddress
        //4. basicPoolAddress(tosEthPool)
        //5. uniswapV3FactoryAddress

        //Treasury
        //1.tosAddress
        //2.calculatorAddress
        //3.wethAddress
        //4.uniswapV3FactoryAddress
        //5.stakingV2Address
        //6.tosEthPoolAddress
        //7.minmumTOSPricePerETH

        //StakingV2
        //1.tosAddress
        //2.[epoch.length(8시간),epoch.number,epoch.end]
        //3.lockTOSAddress
        //4.treasuryAddress
        //5.baseicBondPeriod

        //BondDepository
        //1.tosAddress
        //2.stakingV2Address
        //3.treasuryAddress
        //4.calculatorAddress
        //5.uniswapV3FactoryAddress

  

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

        const tosCalculator = await (await ethers.getContractFactory("TOSValueCalculator"))
            .connect(deployer)
            .deploy();
        await tosCalculator.deployed();
        console.log("tosCalculator: ", tosCalculator.address);
        const tosCalculatorAddress = tosCalculator.address;


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

        await treasuryProxy.connect(deployer).upgradeTo(tresuyLogicAddress);

        console.log("treasuryProxy: ", treasuryProxy.address);
        const treasuryProxyAddrress = treasuryProxy.address;

        const treasuryProxyContract = new ethers.Contract( treasuryProxyAddrress, treasuryLogicAbi.abi, ethers.provider);

        const stakingLogic = await (await ethers.getContractFactory("StakingV2"))
            .connect(deployer)
            .deploy();
        await stakingLogic.deployed();

        console.log("stakingLogic: ", stakingLogic.address);
        const stakingLogicAddress = stakingLogic.address;

        const stakingProxy = await (await ethers.getContractFactory("StakingV2Proxy"))
            .connect(deployer)
            .deploy();
        await stakingProxy.deployed();

        await stakingProxy.connect(deployer).upgradeTo(stakingLogicAddress);

        console.log("stakingProxy: ", stakingProxy.address);
        const stakingProxyAddress = stakingProxy.address;

        const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2LogicAbi.abi, ethers.provider);

        const bondDepositoryLogic = await (await ethers.getContractFactory("BondDepository"))
            .connect(deployer)
            .deploy();

        await bondDepositoryLogic.deployed();

        console.log("bondDepositoryLogic: ", bondDepositoryLogic.address);
        const bondDepositoryLogicAddress = bondDepositoryLogic.address;
        
        const bondDepositoryProxy = await (await ethers.getContractFactory("BondDepositoryProxy"))
            .connect(deployer)
            .deploy();
        await bondDepositoryProxy.deployed();

        await bondDepositoryProxy.connect(deployer).upgradeTo(bondDepositoryLogicAddress);

        console.log("bondDepositoryProxy: ", bondDepositoryProxy.address);
        const bondDepositoryProxyddress = bondDepositoryProxy.address;

        //tosCalCulator initialize
        let npmAddress; //앞에서 받을 것인지? 코드내에서?

        await tosCalculator.connect(deployer).initialize(
            tosAddress,
            wethAddress,
            npmAddress,
            tosWethPoolAddress,
            uniswapFactoryAddress
        )
        console.log("tosCalculator initialized");

        
        //treasury initialize
        let minimumTOSPrice; //설정값 필요

        await treasuryProxy.connect(deployer).initialize(
            tosAddress,
            tosCalculatorAddress,
            wethAddress,
            uniswapFactoryAddress,
            stakingProxyAddress,
            tosWethPoolAddress,
            minimumTOSPrice
        )

        console.log("treasuryProxy initialized");


        //StakingV2 initialize
        const block = await ethers.provider.getBlock('latest')

        let epochLength = 3600 * 8;
        let epochNumber = 0;
        let epochEnd = Number(block.timestamp) + Number(epochLength);
        let basicBondPeriod = (86400*5);


        await stakingProxy.connect(deployer).initialize(
            tosAddress,
            [epochLength,epochNumber,epochEnd],
            lockTosAddress,
            treasuryProxyAddrress,
            basicBondPeriod
        )
        console.log("stakingProxy initialized");


        //bondDepositoryProxy initialize
        await bondDepositoryProxy.connect(deployer).initialize(
            tosAddress,
            stakingProxyAddress,
            treasuryProxyAddrress,
            tosCalculatorAddress,
            uniswapFactoryAddress
        )

        console.log("bondDepositoryProxy initialized");



        // const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2LogicAbi.abi, ethers.provider);

        // await stakingProxyContract.connect(deployer).addPolicy(deployer.address);
        // const policyCheck = await stakingProxyContract.isPolicy(deployer.address)
        // console.log("policyCheck : ", policyCheck)
        
        // const rebasePerEpoch = 87000000000000;
        // await stakingProxyContract.connect(deployer).setRebasePerepoch(rebasePerEpoch)
        // const rebaseCheck = await stakingProxyContract.connect(deployer).rebasePerEpoch()
        // console.log("rebaseCheck : ", Number(rebaseCheck));

        // const index = ethers.utils.parseUnits("10", 18)
        // await stakingProxyContract.connect(deployer).setindex(index);
        // const indexCheck = await stakingProxyContract.index_()
        // console.log("indexCheck : ", Number(indexCheck));

        // console.log("stakingProxyContract : ", stakingProxyContract.address);
    })