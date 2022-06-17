const { expect } = require("chai");
const { ethers } = require("hardhat");

const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

describe("RewardPoolSnapshot", function () {

    let rewardPoolFactory,  rewardPool, tosEvaluator, testLogic, rewardPoolProxyContract, rewardPoolContract;
    let dTosManager, dTosManagerProxy, dTosManagerImp;
    let rewardLPTokenManager;

    // mainnet
    // let tosAddress = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153";
    // let wtontosPool = "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4";

    // rinkeby
    let tosAddress = "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd";
    let wtontosPool = "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf";


    let TOS;
    let tosInfo = {
        name: "TOS",
        symbol: "TOS",
        initialSupply: ethers.BigNumber.from('1'+'0'.repeat(24))
    }

    let info = {
        uniswapV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
        rewardLPTokenManager: null,
        tosAddress: null,
        dTosManager: null,
        dTosManagerImp: null
    }

    let rewardLPTokenManagerInfo = {
        name: "RewardLP",
        symbol: "RLP",
        baseTokenURI: ""
    }

    let dTosManagerInfo = {
        name: "DTOS",
        symbol: "DTOS",
        initialDtosBaseRate: ethers.BigNumber.from('93668115524'),
        initialRebasePeriod: ethers.BigNumber.from('31556952')
    }


    let rewardPoolFactoryInfo = {
        admin: null,
        upgradeAdmin : null,
        logic: null,
        name: "rewardPoolTest1",
        poolAddress : null
    }

    let rewardProgramPoolAddresss = [];

    let mintAmount = ethers.BigNumber.from('1'+'0'.repeat(18));
    let zeroBN = ethers.BigNumber.from('0');

    before(async function () {
        accounts = await ethers.getSigners();
        [admin, user1, user2 ] = accounts
        provider = ethers.provider;

    });

    it("Create TestTOS", async function () {
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        /*
        TOS = await TestERC20.connect(admin).deploy(
            tosInfo.name,
            tosInfo.symbol,
            tosInfo.initialSupply
        );
        await TOS.deployed();
        */
        // TOS = await ethers.getContractAt("TestERC20", tosAddress);

        info.tosAddress = tosAddress;

    });

    it("Create DTOSManager Implementation", async function () {
        const DTOSManager = await ethers.getContractFactory("DTOSManager");
        dTosManagerImp = await DTOSManager.connect(admin).deploy();
        await dTosManagerImp.deployed();
        info.dTosManagerImp = dTosManagerImp.address;
    });

    it("Create DTOSManagerProxy", async function () {
        const DTOSManagerProxy = await ethers.getContractFactory("DTOSManagerProxy");
        dTosManagerProxy = await DTOSManagerProxy.connect(admin).deploy();
        await dTosManagerProxy.deployed();

        await dTosManagerProxy.connect(admin).upgradeTo(dTosManagerImp.address);
        await dTosManagerProxy.connect(admin).initialize(
            dTosManagerInfo.name,
            dTosManagerInfo.symbol,
            tosAddress
        );

        info.dTosManager = dTosManagerProxy.address;
    });

    it("Create RewardLPTokenManager", async function () {
        const RewardLPTokenManager = await ethers.getContractFactory("RewardLPTokenManager");
        rewardLPTokenManager = await RewardLPTokenManager.connect(admin).deploy(
            rewardLPTokenManagerInfo.name,
            rewardLPTokenManagerInfo.symbol,
            rewardLPTokenManagerInfo.baseTokenURI
        );
        await rewardLPTokenManager.deployed();

        await rewardLPTokenManager.connect(admin).setDtos(dTosManagerProxy.address);
        info.rewardLPTokenManager = rewardLPTokenManager.address;
    });

    it("Set DTOSManager ", async function () {
        dTosManager = await ethers.getContractAt("DTOSManager", dTosManagerProxy.address);

        await dTosManager.connect(admin).setRewardLPTokenManager(rewardLPTokenManager.address);
        //await dTosManager.connect(admin).setRewardPoolFactory();
        //await dTosManager.connect(admin).setBondDepository();
        //await dTosManager.connect(admin).setTosAddress();

        await dTosManager.connect(admin).setInitialReabseInfo(dTosManagerInfo.initialRebasePeriod, dTosManagerInfo.initialDtosBaseRate);

    });


    it("deploying library TOSEvaluator", async function () {
        const TOSEvaluator = await ethers.getContractFactory("TOSEvaluator");
        tosEvaluator = await TOSEvaluator.connect(admin).deploy();

    });

    it("Create RewardPoolSnapshot", async function () {
        const RewardPool = await ethers.getContractFactory("RewardPoolSnapshot", {
            libraries: {
                TOSEvaluator: tosEvaluator.address,
            }});

        rewardPool = await RewardPool.connect(admin).deploy();
        await rewardPool.deployed();
    });

    it("Create RewardPoolFactory", async function () {

        const RewardPoolFactory = await ethers.getContractFactory("RewardPoolFactory");
        rewardPoolFactory = await RewardPoolFactory.connect(admin).deploy();
        await rewardPoolFactory.deployed();

        rewardPoolFactoryInfo.admin = admin;
        rewardPoolFactoryInfo.upgradeAdmin = admin;

        await dTosManager.connect(admin).setRewardPoolFactory(rewardPoolFactory.address);
    });

    describe("0. RewardPoolFactory  ", function () {

        it("0-1. addAdmin : when not admin, fail", async function () {
            expect(await rewardPoolFactory.isAdmin(user2.address)).to.be.eq(false);
            await expect(rewardPoolFactory.connect(user2).addAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("0-1. addAdmin only admin ", async function () {
            expect(await rewardPoolFactory.isAdmin(rewardPoolFactoryInfo.admin.address)).to.be.eq(true);
            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).addAdmin(user2.address);
        });

        it("0-2. removeAdmin : when not self-admin, fail", async function () {
            await expect(rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).removeAdmin(user2.address)).to.be.revertedWith("AccessControl: can only renounce roles for self");
        });

        it("0-2. removeAdmin ", async function () {
            await rewardPoolFactory.connect(user2).removeAdmin(user2.address);
        });

        it("0-3. transferAdmin : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).transferAdmin(user1.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("0-3. transferAdmin ", async function () {
            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).addAdmin(user2.address);

            expect(await rewardPoolFactory.isAdmin(user2.address)).to.be.eq(true);

            await rewardPoolFactory.connect(user2).transferAdmin(user1.address);
        });

        it("0-4. setUpgradeAdmin : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).setUpgradeAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("0-4. setUpgradeAdmin ", async function () {
            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).setUpgradeAdmin(user2.address);

            expect(await rewardPoolFactory.upgradeAdmin()).to.be.eq(user2.address);
            rewardPoolFactoryInfo.upgradeAdmin = user2;
        });

        it("0-5. setAddresses : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).setAddresses(
                info.uniswapV3Factory,
                info.nonfungiblePositionManager,
                info.rewardLPTokenManager,
                info.tosAddress,
                info.dTosManager
            )).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("0-5. setAddresses ", async function () {

            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).setAddresses(
                info.uniswapV3Factory,
                info.nonfungiblePositionManager,
                info.rewardLPTokenManager,
                info.tosAddress,
                info.dTosManager
            );

            expect(await rewardPoolFactory.uniswapV3Factory()).to.be.eq(info.uniswapV3Factory);
            expect(await rewardPoolFactory.nonfungiblePositionManager()).to.be.eq(info.nonfungiblePositionManager);
            expect(await rewardPoolFactory.rewardLPTokenManager()).to.be.eq(info.rewardLPTokenManager);
            expect(await rewardPoolFactory.tosAddress()).to.be.eq(info.tosAddress);
            expect(await rewardPoolFactory.dtos()).to.be.eq(info.dTosManager);
        });

        it("0-6. setLogic : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).setLogic(
                rewardPool.address
            )).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("0-6. setLogic ", async function () {

            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).setLogic(
                rewardPool.address
            );

            expect(await rewardPoolFactory.vaultLogic()).to.be.eq(rewardPool.address);
            rewardPoolFactoryInfo.logic = rewardPool;
        });

        it("0-7. create : when not admin, fail ", async function () {

            await expect(rewardPoolFactory.connect(user2).create(
                rewardPoolFactoryInfo.name,
                wtontosPool
            )).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("0-7. create ", async function () {

            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).create(
                rewardPoolFactoryInfo.name,
                wtontosPool
            );
            rewardPoolFactoryInfo.poolAddress = wtontosPool;

            expect(await rewardPoolFactory.vaultLogic()).to.be.eq(rewardPool.address);

            let createdContract = await rewardPoolFactory.lastestCreated();
            expect(createdContract.name).to.be.eq(rewardPoolFactoryInfo.name);
            expect(createdContract.contractAddress).to.not.eq("0x0000000000000000000000000000000000000000");

            rewardProgramPoolAddresss.push(createdContract.contractAddress);
        });

        it("0-8. upgradeContractLogic : when not admin, fail ", async function () {
            const TestRewardPool = await ethers.getContractFactory("RewardPoolSnapshot", {
                libraries: {
                    TOSEvaluator: tosEvaluator.address,
                }});

            testLogic = await TestRewardPool.connect(admin).deploy();
            await testLogic.deployed();

            let index = 0;

            await expect(rewardPoolFactory.connect(user2).upgradeContractLogic(
                rewardProgramPoolAddresss[index],
                testLogic.address,
                index,
                true
            )).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("0-8. upgradeContractLogic ", async function () {
            let index = 0;

            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).upgradeContractLogic(
                rewardProgramPoolAddresss[index],
                testLogic.address,
                index,
                true
            );

            let poolContract = await ethers.getContractAt("RewardPoolSnapshotProxy", rewardProgramPoolAddresss[index]);
            expect(await poolContract.implementation2(index)).to.be.eq(testLogic.address);

            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).upgradeContractLogic(
                rewardProgramPoolAddresss[index],
                rewardPool.address,
                index,
                true
            );
            expect(await poolContract.implementation2(index)).to.be.eq(rewardPool.address);


            rewardPoolProxyContract = await ethers.getContractAt("RewardPoolSnapshotProxy", rewardProgramPoolAddresss[index]);
            rewardPoolContract = await ethers.getContractAt("RewardPoolSnapshot", rewardProgramPoolAddresss[index]);

        });


    });

    describe("1. RewardPool: Proxy Test  ", function () {
        it("1-1. addAdmin : when not admin, fail", async function () {
            expect(await rewardPoolProxyContract.isAdmin(user2.address)).to.be.eq(false);
            await expect(rewardPoolProxyContract.connect(user2).addAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });
        it("1-1. addAdmin only admin ", async function () {
            expect(await rewardPoolProxyContract.isAdmin(rewardPoolFactoryInfo.upgradeAdmin.address)).to.be.eq(true);
            await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin.admin).addAdmin(user2.address);
        });
        it("1-2. removeAdmin : when not self-admin, fail", async function () {
            await expect(rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).removeAdmin(user2.address)).to.be.revertedWith("AccessControl: can only renounce roles for self");
        });
        it("1-2. removeAdmin ", async function () {
            await rewardPoolProxyContract.connect(user2).removeAdmin(user2.address);
        });
        it("1-3. transferAdmin : when not admin, fail ", async function () {
            await expect(rewardPoolProxyContract.connect(user2).transferAdmin(user1.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-3. transferAdmin ", async function () {
            await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).addAdmin(user2.address);

            expect(await rewardPoolProxyContract.isAdmin(user2.address)).to.be.eq(true);

            await rewardPoolProxyContract.connect(user2).transferAdmin(user1.address);
        });

        it("1-4. setImplementation2 : when not admin, fail", async function () {
            await expect(rewardPoolProxyContract.connect(user2).setImplementation2(dtosImpl.address,0, true))
            .to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-4/5. setImplementation2", async function () {

            let tx = await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).setImplementation2(
                dtosImpl.address, 0, true
            );

            await tx.wait();
        });

        it("1-6/7. setAliveImplementation2 : Only admin ", async function () {

            const TestLogic = await ethers.getContractFactory("TestLogic");
            let testLogicDeployed = await TestLogic.deploy();
            await testLogicDeployed.deployed();
            testLogicAddress = testLogicDeployed.address ;

            let _func1 = Web3EthAbi.encodeFunctionSignature("sayAdd(uint256,uint256)") ;
            let _func2 = Web3EthAbi.encodeFunctionSignature("sayMul(uint256,uint256)") ;

            expect(await rewardPoolProxyContract.isAdmin(user1.address)).to.be.eq(true);
            expect(await rewardPoolProxyContract.isAdmin(user2.address)).to.be.eq(false);


            await expect(
                rewardPoolProxyContract.connect(user2).setSelectorImplementations2(
                    [_func1, _func2],
                    testLogicAddress )
            ).to.be.revertedWith("Accessible: Caller is not an admin");

            await expect(
                rewardPoolProxyContract.connect(user2).setAliveImplementation2(
                        testLogicAddress, false
                    )
            ).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("1-5/6/7/8/9. setAliveImplementation2", async function () {

            const TestLogic = await ethers.getContractFactory("TestLogic");
            let testLogicDeployed = await TestLogic.deploy();
            await testLogicDeployed.deployed();
            testLogicAddress = testLogicDeployed.address ;

            let _func1 = Web3EthAbi.encodeFunctionSignature("sayAdd(uint256,uint256)") ;
            let _func2 = Web3EthAbi.encodeFunctionSignature("sayMul(uint256,uint256)") ;

            let tx = await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).setImplementation2(
                testLogicAddress, 1, true
            );

            await tx.wait();

            tx = await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).setSelectorImplementations2(
                [_func1, _func2],
                testLogicAddress
            );

            await tx.wait();

            expect(await rewardPoolProxyContract.implementation2(1)).to.be.eq(testLogicAddress);
            expect(await rewardPoolProxyContract.getSelectorImplementation2(_func1)).to.be.eq(testLogicAddress);
            expect(await rewardPoolProxyContract.getSelectorImplementation2(_func2)).to.be.eq(testLogicAddress);

            const TestLogicContract = await ethers.getContractAt("TestLogic", dtosProxy.address);

            let a = ethers.BigNumber.from("1");
            let b = ethers.BigNumber.from("2");

            let add = await TestLogicContract.sayAdd(a, b);
            expect(add).to.be.eq(a.add(b));

            let mul = await TestLogicContract.sayMul(a, b);
            expect(mul).to.be.eq(a.mul(b));

            tx = await rewardPoolProxyContract.connect(dTOS.admin).setAliveImplementation2(
                testLogicAddress, false
            );

            await tx.wait();

            await expect(
                TestLogicContract.sayAdd(a, b)
            ).to.be.reverted ;

            await expect(
                TestLogicContract.sayMul(a, b)
            ).to.be.reverted ;

        });

        /*
        it("1-10. initialize : when not admin, fail", async function () {

            await expect(
                rewardPoolProxyContract.connect(user2).initialize(
                    dTOS.name,
                    dTOS.symbol
                )
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-10. initialize", async function () {
            expect(await rewardPoolProxyContract.isAdmin(user1.address)).to.be.eq(true);

            let tx = await dtosProxy.connect(user1).initialize(
                        dTOS.name,
                        dTOS.symbol
                    );

            await tx.wait();

            expect(await rewardPoolProxyContract.name()).to.be.equal(dTOS.name);
            expect(await rewardPoolProxyContract.symbol()).to.be.equal(dTOS.symbol);
            expect(await rewardPoolProxyContract.decimals()).to.be.equal(dTOS.decimals);

        });

        it("1-11. initialize : only once exceute", async function () {

            await expect(
                rewardPoolProxyContract.connect(dTOS.admin).initialize(
                    dTOS.name,
                    dTOS.symbol
                )
            ).to.be.revertedWith("already set");
        });


        it("1-12. setProxyPause : when not admin, fail", async function () {

            expect(await rewardPoolProxyContract.isAdmin(user2.address)).to.be.eq(false);
            await expect(
                rewardPoolProxyContract.connect(user2).setProxyPause(true)
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-12. setProxyPause : only admin", async function () {

            expect(await rewardPoolProxyContract.isAdmin(user1.address)).to.be.eq(true);
            await rewardPoolProxyContract.connect(user1).setProxyPause(true);

            expect(await rewardPoolProxyContract.pauseProxy()).to.be.eq(true);

            dTOS.contractImp = await ethers.getContractAt("DTOS", dtosProxy.address);

            await expect(
                dTOS.contractImp.totalSupply()
            ).to.be.revertedWith("Proxy: impl OR proxy is false");

            await dtosProxy.connect(user1).setProxyPause(false);
            expect(await dtosProxy.pauseProxy()).to.be.eq(false);

            expect(await dTOS.contractImp["totalSupply()"]()).to.be.eq(ethers.BigNumber.from("0"));
        });
         */

    });

    /*
    describe("2. Only Admin Functions ", function () {

        it("2-1. setRewardLPTokenManager : when not admin, fail", async function () {

            expect(await dTOS.contractImp.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTOS.contractImp.connect(user2).setRewardLPTokenManager(user2.address))
                .to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1. setRewardLPTokenManager ", async function () {

            expect(await dTOS.contractImp.isAdmin(user1.address)).to.be.eq(true);
            await dTOS.contractImp.connect(user1).setRewardLPTokenManager(user2.address);
            expect(await dTOS.contractImp.rewardLPTokenManager()).to.be.eq(user2.address);
        });

        it("2-2. setRebaseInfo : when not admin, fail", async function () {

            expect(await dTOS.contractImp.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTOS.contractImp.connect(user2).setRebaseInfo(
                dTOS.rebasePeriod, dTOS.rebaseInterestRate
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-2. setRebaseInfo ", async function () {

            expect(await dTOS.contractImp.isAdmin(user1.address)).to.be.eq(true);
            await dTOS.contractImp.connect(user1).setRebaseInfo(dTOS.rebasePeriod, dTOS.rebaseInterestRate);
            expect(await dTOS.contractImp.compoundInteresRatePerRebase()).to.be.eq(dTOS.rebaseInterestRate);
            expect(await dTOS.contractImp.rebaseIntervalSecond()).to.be.eq(dTOS.rebasePeriod);
        });
    });


    describe("3. Only RewardLPManager Functions ", function () {

        it("3-1. rebase : when not RewardLPManager, fail", async function () {

            expect(await dTOS.contractImp.rewardLPTokenManager()).to.be.eq(user2.address);
            await expect(dTOS.contractImp.connect(user1).rebase()).to.be.revertedWith("DTOS:sender is not rewardLPTokenManager");
        });

        it("3-1. rebase ", async function () {
            expect(await dTOS.contractImp.rewardLPTokenManager()).to.be.eq(user2.address);

            await dTOS.contractImp.connect(user2).rebase();
        });

        it("3-2. mint : when not RewardLPManager, fail", async function () {
            expect(await dTOS.contractImp.rewardLPTokenManager()).to.be.eq(user2.address);
            await expect(dTOS.contractImp.connect(user1).mint(user1.address, mintAmount)).to.be.revertedWith("DTOS:sender is not rewardLPTokenManager");
        });

        it("3-2. mint : first ", async function () {

            expect(await dTOS.contractImp.rewardLPTokenManager()).to.be.eq(user2.address);
            await dTOS.contractImp.connect(user2).mint(user1.address, mintAmount);


            expect(await dTOS.contractImp.totalSupply()).to.be.eq(mintAmount);
            expect(await dTOS.contractImp.balanceOf(user1.address)).to.be.eq(mintAmount);
            expect(await dTOS.contractImp.lastRebaseTime()).to.be.gt(zeroBN);

        });

        it("      pass blocks", async function () {
            let block = await ethers.provider.getBlock();
            let passTime =  60*60*24 ;

            ethers.provider.send("evm_increaseTime", [passTime])
            ethers.provider.send("evm_mine")
        });

        it("3-2. mint : second  ", async function () {

            let total = await dTOS.contractImp.totalSupply();
            let balance = await dTOS.contractImp.balanceOf(user1.address);

            expect(await dTOS.contractImp.rewardLPTokenManager()).to.be.eq(user2.address);
            await dTOS.contractImp.connect(user2).mint(user1.address, mintAmount);

            expect(await dTOS.contractImp.totalSupply()).to.be.gt(total.add(mintAmount));
            expect(await dTOS.contractImp.balanceOf(user1.address)).to.be.gt(balance.add(mintAmount));
            expect(await dTOS.contractImp.lastRebaseTime()).to.be.gt(zeroBN);

            // let total1 = await dTOS.contractImp.totalSupply();
            // console.log('total',total1);

            // let compound = await dTOS.contractImp.compound(
            //     ethers.BigNumber.from('1000000000000000000'),
            //     rebaseInterestRate,
            //     rebasePeriod,
            // );

            // console.log('compound',compound);

        });

    });
    */
});
