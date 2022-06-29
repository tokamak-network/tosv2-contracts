const { expect } = require("chai");
const { ethers } = require("hardhat");

const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

describe("RewardPoolSnapshot", function () {

    let rewardPoolFactory,  rewardPool, tosEvaluator, testLogic, rewardPoolProxyContract, rewardPoolContract;
    let dTosManager, dTosManagerProxy, dTosManagerImp;
    let rewardLPTokenManagerm , policy;
    let nonfungiblePositionManager ;

    // mainnet
    // let tosAddress = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153";
    // let wtontosPool = "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4";

    // rinkeby
    let tosAddress = "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd";
    let wtontosPool = "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf";
    let lpWTONTOS_tokenId_admin = ethers.BigNumber.from("20968");
    let lpWTONTOS_tokenId2_admin = ethers.BigNumber.from("21313");

    let lpWTONTOS_tokenId = ethers.BigNumber.from("6740");
    let lpWTONTOS_tokenId_outofrange = ethers.BigNumber.from("4268");
    let lpTOSZK6_tokenId_zeroliquidity = ethers.BigNumber.from("20813");
    let lpTOSZK5_19316 = ethers.BigNumber.from("19316");

    let admin_tokens = {
        token_normal: lpWTONTOS_tokenId_admin,
        token_otherpool: lpTOSZK5_19316,
        token_normal2: lpWTONTOS_tokenId2_admin,
    }

    let user1_tokens = {
        token_normal: lpWTONTOS_tokenId,
        token_outofrange: lpWTONTOS_tokenId_outofrange,
        zeroliquidity: lpWTONTOS_tokenId_outofrange
    }

    let TOS;
    let tosInfo = {
        name: "TOS",
        symbol: "TOS",
        initialSupply: ethers.BigNumber.from('1'+'0'.repeat(24))
    }

    let policyInfo = {
        contract: null,
        admin: null,
        minDtosBaseRate: ethers.BigNumber.from('0'),
        maxDtosBaseRate: ethers.BigNumber.from('3'+'0'.repeat(17)),
        initialDtosBaseRate: ethers.BigNumber.from('1'+'0'.repeat(17)),  // 10% , 0.1
        initialInterestRatePerRebase:ethers.BigNumber.from('1'+'0'.repeat(16)), // 0.01
        initialRebaseIntervalSecond: ethers.BigNumber.from('86400')       // 1 Day
    }

    let info = {
        uniswapV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
        rewardLPTokenManager: null,
        tosAddress: null,
        dTosManager: null,
        dTosManagerImp: null,
        policy: null
    }

    let rewardLPTokenManagerInfo = {
        name: "RewardLP",
        symbol: "RLP",
        baseTokenURI: "",
        admin: null,
        lists: []
    }

    let dTosManagerInfo = {
        name: "DTOS",
        symbol: "DTOS",
        admin: null
        // initialDtosBaseRate: ethers.BigNumber.from('93668115524'),
        // initialRebasePeriod: ethers.BigNumber.from('31556952')
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
    let etherBN = ethers.BigNumber.from('1'+'0'.repeat(18));
    before(async function () {
        accounts = await ethers.getSigners();
        [admin, user1, user2, user3, user4 ] = accounts
        provider = ethers.provider;

        await hre.ethers.provider.send("hardhat_setBalance", [
            admin.address,
          "0x56BC75E2D63100000",
        ]);

        await hre.ethers.provider.send("hardhat_setBalance", [
            user1.address,
            "0x56BC75E2D63100000",
        ]);

        await hre.ethers.provider.send("hardhat_setBalance", [
            user2.address,
            "0x56BC75E2D63100000",
        ]);

        await hre.ethers.provider.send("hardhat_setBalance", [
            user3.address,
            "0x56BC75E2D63100000",
        ]);

        await hre.ethers.provider.send("hardhat_setBalance", [
            user4.address,
            "0x56BC75E2D63100000",
        ]);


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

    it("Create DTOSPolicy", async function () {
        const DTOSPolicy = await ethers.getContractFactory("DTOSPolicy");

        // policy = await DTOSPolicy.connect(admin).deploy(
        //     policyInfo.minDtosBaseRate,
        //     policyInfo.maxDtosBaseRate,
        //     policyInfo.initialDtosBaseRate,
        //     policyInfo.initialInterestRatePerRebase,
        //     policyInfo.initialRebaseIntervalSecond
        // );

        policy = await DTOSPolicy.connect(admin).deploy(
            zeroBN,
            zeroBN,
            zeroBN,
            zeroBN,
            zeroBN
        );

        await policy.deployed();
        policyInfo.contract = policy;
        policyInfo.admin = admin;
        info.policy = policy.address;
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
        // await dTosManagerProxy.connect(admin).initialize(
        //     dTosManagerInfo.name,
        //     dTosManagerInfo.symbol,
        //     tosAddress
        // );

        info.dTosManager = dTosManagerProxy.address;
        dTosManagerInfo.admin = admin;
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
        rewardLPTokenManagerInfo.admin = admin;
    });

    it("Set DTOSManager ", async function () {
        dTosManager = await ethers.getContractAt("DTOSManager", dTosManagerProxy.address);

        //await dTosManager.connect(admin).setRewardPoolFactory();
        //await dTosManager.connect(admin).setTosAddress(tosAddress);
        //await dTosManager.connect(admin).setPolicyAddress(policyInfo.contract.address);

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

        await dTosManagerProxy.connect(admin).setRewardPoolFactory(rewardPoolFactory.address);
    });

    describe("1-1. DTOSPolicy  ", function () {

        it("1-1-1. setMinMaxBaseRate : when not admin, fail", async function () {
            expect(await policy.isAdmin(user2.address)).to.be.eq(false);
            await expect(policy.connect(user2).setMinMaxBaseRate(policyInfo.minDtosBaseRate, policyInfo.maxDtosBaseRate)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-1-1. setMinMaxBaseRate only admin ", async function () {
            expect(await policy.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await policy.connect(policyInfo.admin).setMinMaxBaseRate(
                    policyInfo.minDtosBaseRate, policyInfo.maxDtosBaseRate
                );

            expect(await policy.minDtosBaseRate()).to.be.eq(policyInfo.minDtosBaseRate);
            expect(await policy.maxDtosBaseRate()).to.be.eq(policyInfo.maxDtosBaseRate);
        });
        it("1-1-2. setInitialDtosBaseInfo : when not admin, fail", async function () {
            expect(await policy.isAdmin(user2.address)).to.be.eq(false);
            await expect(policy.connect(user2).setInitialDtosBaseInfo(policyInfo.initialDtosBaseRate)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-1-2. setInitialDtosBaseInfo only admin ", async function () {
            expect(await policy.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await policy.connect(policyInfo.admin).setInitialDtosBaseInfo(policyInfo.initialDtosBaseRate);
            expect(await policy.initialDtosBaseRate()).to.be.eq(policyInfo.initialDtosBaseRate);
        });

        it("1-1-3. setInitialReabseInfo : when not admin, fail", async function () {
            expect(await policy.isAdmin(user2.address)).to.be.eq(false);
            await expect(policy.connect(user2).setInitialReabseInfo(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-1-3. setInitialReabseInfo only admin ", async function () {
            expect(await policy.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await policy.connect(policyInfo.admin).setInitialReabseInfo(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            );
            expect(await policy.initialRebaseIntervalSecond()).to.be.eq(policyInfo.initialRebaseIntervalSecond);
            expect(await policy.initialInterestRatePerRebase()).to.be.eq(policyInfo.initialInterestRatePerRebase);
        });
        /*
        it("1-1-4. execPause  : when not admin, fail", async function () {
            expect(await policy.isAdmin(user2.address)).to.be.eq(false);
            await expect(rewardPpolicyoolFactory.connect(user2).addAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-1-4. execPause  only admin ", async function () {
            expect(await policy.isAdmin(rewardPoolFactoryInfo.admin.address)).to.be.eq(true);
            await policy.connect(rewardPoolFactoryInfo.admin).addAdmin(user2.address);
        });
        */
    });

    describe("2-1. DTOSManager : Only Admin(DAO) Functions ", function () {

        it("2-1-1. initialize : when not admin, fail", async function () {
            expect(await dTosManagerProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(
                dTosManagerProxy.connect(user2).initialize(
                    dTosManagerInfo.name,
                    dTosManagerInfo.symbol,
                    tosAddress
                )
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-1. initialize only admin ", async function () {
            expect(await dTosManagerProxy.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);
            await dTosManagerProxy.connect(admin).initialize(
                dTosManagerInfo.name,
                dTosManagerInfo.symbol,
                tosAddress
            );

            expect(await dTosManagerProxy.name()).to.be.eq(dTosManagerInfo.name);
            expect(await dTosManagerProxy.symbol()).to.be.eq(dTosManagerInfo.symbol);
            expect(await dTosManagerProxy.tosAddress()).to.be.eq(tosAddress);
        });

        it("2-1-2. initialize only once ", async function () {
            expect(await dTosManager.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);
            await expect(
                dTosManagerProxy.connect(dTosManagerInfo.admin).initialize(
                    dTosManagerInfo.name,
                    dTosManagerInfo.symbol,
                    tosAddress
                )
            ).to.be.revertedWith("already set");
        });

        it("2-1-3. setPolicyAddress : when not admin, fail", async function () {
            expect(await dTosManagerProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManagerProxy.connect(user2).setPolicyAddress(
                policyInfo.contract.address
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-3. setPolicyAddress only admin ", async function () {
            expect(await dTosManagerProxy.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);
            await dTosManagerProxy.connect(dTosManagerInfo.admin).setPolicyAddress(
                policyInfo.contract.address
            );
            expect(await dTosManagerProxy.policyAddress()).to.be.eq(policyInfo.contract.address);
        });

        it("2-1-4. setTosAddress : when not admin, fail", async function () {
            expect(await dTosManagerProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManagerProxy.connect(user2).setTosAddress(
                tosAddress
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-4. setTosAddress only admin ", async function () {
            expect(await dTosManagerProxy.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);
            await dTosManagerProxy.connect(dTosManagerInfo.admin).setTosAddress(
                policyInfo.contract.address
            );
            expect(await dTosManagerProxy.tosAddress()).to.be.eq(policyInfo.contract.address);

            await dTosManagerProxy.connect(dTosManagerInfo.admin).setTosAddress(
                tosAddress
            );
            expect(await dTosManagerProxy.tosAddress()).to.be.eq(tosAddress);
        });

        it("2-1-5. setRewardPoolFactory : when not admin, fail", async function () {
            expect(await dTosManagerProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManagerProxy.connect(user2).setRewardPoolFactory(
                rewardPoolFactory.address
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-5. setRewardPoolFactory only admin ", async function () {
            expect(await dTosManagerProxy.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);
            await dTosManagerProxy.connect(dTosManagerInfo.admin).setRewardPoolFactory(
                policyInfo.contract.address
            );
            expect(await dTosManagerProxy.rewardPoolFactory()).to.be.eq(policyInfo.contract.address);

            await dTosManagerProxy.connect(dTosManagerInfo.admin).setRewardPoolFactory(
                rewardPoolFactory.address
            );
            expect(await dTosManagerProxy.rewardPoolFactory()).to.be.eq(rewardPoolFactory.address);
        });

        it("2-1-5-1. setRewardLPTokenManager : when not admin, fail", async function () {
            expect(await dTosManagerProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManagerProxy.connect(user2).setRewardLPTokenManager(
                info.rewardLPTokenManager
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-5-1. setRewardLPTokenManager only admin ", async function () {
            expect(await dTosManagerProxy.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);
            await dTosManagerProxy.connect(dTosManagerInfo.admin).setRewardLPTokenManager(
                info.rewardLPTokenManager
            );
            expect(await dTosManagerProxy.rewardLPTokenManager()).to.be.eq(info.rewardLPTokenManager);
        });
        /*


        it("2-1-8. addPoolAndInitialize : when not admin, fail", async function () {
            expect(await dTosManager.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManager.connect(user2).addPoolAndInitialize(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-8. addPoolAndInitialize only admin ", async function () {
            expect(await dTosManager.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await dTosManager.connect(policyInfo.admin).addPoolAndInitialize(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            );
            expect(await dTosManager.initialRebaseIntervalSecond()).to.be.eq(policyInfo.initialRebaseIntervalSecond);
            expect(await dTosManager.initialInterestRatePerRebase()).to.be.eq(policyInfo.initialInterestRatePerRebase);
        });
        it("2-1-9. addPool : when not admin, fail", async function () {
            expect(await dTosManager.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManager.connect(user2).addPool(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-9. addPool only admin ", async function () {
            expect(await dTosManager.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await dTosManager.connect(policyInfo.admin).addPool(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            );
            expect(await dTosManager.initialRebaseIntervalSecond()).to.be.eq(policyInfo.initialRebaseIntervalSecond);
            expect(await dTosManager.initialInterestRatePerRebase()).to.be.eq(policyInfo.initialInterestRatePerRebase);
        });

        it("2-1-10. deletePool : when not admin, fail", async function () {
            expect(await dTosManager.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManager.connect(user2).deletePool(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("2-1-10. deletePool only admin ", async function () {
            expect(await dTosManager.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await dTosManager.connect(policyInfo.admin).deletePool(
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            );
            expect(await dTosManager.initialRebaseIntervalSecond()).to.be.eq(policyInfo.initialRebaseIntervalSecond);
            expect(await dTosManager.initialInterestRatePerRebase()).to.be.eq(policyInfo.initialInterestRatePerRebase);
        });
        */
    });

    describe("3. RewardPoolFactory  ", function () {

        it("3-1. addAdmin : when not admin, fail", async function () {
            expect(await rewardPoolFactory.isAdmin(user2.address)).to.be.eq(false);
            await expect(rewardPoolFactory.connect(user2).addAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("3-1. addAdmin only admin ", async function () {
            expect(await rewardPoolFactory.isAdmin(rewardPoolFactoryInfo.admin.address)).to.be.eq(true);
            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).addAdmin(user2.address);
        });

        it("3-2. removeAdmin : when not self-admin, fail", async function () {
            await expect(rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).removeAdmin(user2.address)).to.be.revertedWith("AccessControl: can only renounce roles for self");
        });

        it("3-2. removeAdmin ", async function () {
            await rewardPoolFactory.connect(user2).removeAdmin(user2.address);
        });

        it("3-3. transferAdmin : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).transferAdmin(user1.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("3-3. transferAdmin ", async function () {
            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).addAdmin(user2.address);

            expect(await rewardPoolFactory.isAdmin(user2.address)).to.be.eq(true);

            await rewardPoolFactory.connect(user2).transferAdmin(user1.address);
        });

        it("3-4. setUpgradeAdmin : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).setUpgradeAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("3-4. setUpgradeAdmin ", async function () {
            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).setUpgradeAdmin(user2.address);

            expect(await rewardPoolFactory.upgradeAdmin()).to.be.eq(user2.address);
            rewardPoolFactoryInfo.upgradeAdmin = user2;
        });

        it("3-5. setAddresses : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).setAddresses(
                info.uniswapV3Factory,
                info.nonfungiblePositionManager,
                info.rewardLPTokenManager,
                info.tosAddress,
                info.dTosManager,
                info.policy
            )).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("3-5. setAddresses ", async function () {

            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).setAddresses(
                info.uniswapV3Factory,
                info.nonfungiblePositionManager,
                info.rewardLPTokenManager,
                info.tosAddress,
                info.dTosManager,
                info.policy
            );

            expect(await rewardPoolFactory.uniswapV3Factory()).to.be.eq(info.uniswapV3Factory);
            expect(await rewardPoolFactory.nonfungiblePositionManager()).to.be.eq(info.nonfungiblePositionManager);
            expect(await rewardPoolFactory.rewardLPTokenManager()).to.be.eq(info.rewardLPTokenManager);
            expect(await rewardPoolFactory.tosAddress()).to.be.eq(info.tosAddress);
            expect(await rewardPoolFactory.dtos()).to.be.eq(info.dTosManager);
            expect(await rewardPoolFactory.dtosPolicy()).to.be.eq(info.policy);
        });

        it("3-6. setLogic : when not admin, fail ", async function () {
            await expect(rewardPoolFactory.connect(user2).setLogic(
                rewardPool.address
            )).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("3-6. setLogic ", async function () {

            await rewardPoolFactory.connect(rewardPoolFactoryInfo.admin).setLogic(
                rewardPool.address
            );

            expect(await rewardPoolFactory.vaultLogic()).to.be.eq(rewardPool.address);
            rewardPoolFactoryInfo.logic = rewardPool;
        });

        it("3-7. create : when not admin, fail ", async function () {

            await expect(rewardPoolFactory.connect(user2).create(
                rewardPoolFactoryInfo.name,
                wtontosPool
            )).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("3-7 / 2-1-10. create ", async function () {
            expect(await rewardPoolFactory.isAdmin(rewardPoolFactoryInfo.admin.address)).to.be.eq(true);

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

        it("3-8. upgradeContractLogic : when not admin, fail ", async function () {
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

        it("3-8. upgradeContractLogic ", async function () {
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
            // rewardPoolContract = await ethers.getContractAt("RewardPoolSnapshot", rewardProgramPoolAddresss[index]);

        });

    });

    describe("4-1. RewardPoolProxy ", function () {
        it("4-1-1. addAdmin : when not admin, fail", async function () {
            expect(await rewardPoolProxyContract.isAdmin(user1.address)).to.be.eq(false);
            await expect(rewardPoolProxyContract.connect(user1).addAdmin(user1.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });
        it("4-1-1. addAdmin only admin ", async function () {
            expect(await rewardPoolProxyContract.isAdmin(rewardPoolFactoryInfo.upgradeAdmin.address)).to.be.eq(true);
            await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).addAdmin(user1.address);
        });
        it("4-1-2. removeAdmin : when not self-admin, fail", async function () {
            await expect(rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).removeAdmin(user1.address)).to.be.revertedWith("AccessControl: can only renounce roles for self");
        });
        it("4-1-2. removeAdmin ", async function () {
            await rewardPoolProxyContract.connect(user1).removeAdmin(user1.address);
        });
        it("4-1-3. transferAdmin : when not admin, fail ", async function () {
            await expect(rewardPoolProxyContract.connect(user1).transferAdmin(user1.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("4-1-3. transferAdmin ", async function () {
            await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).addAdmin(user3.address);

            expect(await rewardPoolProxyContract.isAdmin(user3.address)).to.be.eq(true);

            await rewardPoolProxyContract.connect(user3).transferAdmin(user4.address);
        });

        it("4-1-4. setImplementation2 : when not admin, fail", async function () {
            await expect(rewardPoolProxyContract.connect(user3).setImplementation2(rewardPool.address,0, true))
            .to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("4-1-4/5. setImplementation2", async function () {

            let tx = await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).setImplementation2(
                rewardPool.address, 0, true
            );

            await tx.wait();
        });

        it("4-1-6/7. setAliveImplementation2 : Only admin ", async function () {

            const TestLogic = await ethers.getContractFactory("TestLogic");
            let testLogicDeployed = await TestLogic.deploy();
            await testLogicDeployed.deployed();
            testLogicAddress = testLogicDeployed.address ;

            let _func1 = Web3EthAbi.encodeFunctionSignature("sayAdd(uint256,uint256)") ;
            let _func2 = Web3EthAbi.encodeFunctionSignature("sayMul(uint256,uint256)") ;

            expect(await rewardPoolProxyContract.isAdmin(user1.address)).to.be.eq(false);

            await expect(
                rewardPoolProxyContract.connect(user1).setSelectorImplementations2(
                    [_func1, _func2],
                    testLogicAddress )
            ).to.be.revertedWith("Accessible: Caller is not an admin");

            await expect(
                rewardPoolProxyContract.connect(user1).setAliveImplementation2(
                        testLogicAddress, false
                    )
            ).to.be.revertedWith("Accessible: Caller is not an admin");

        });

        it("4-1-5/6/7/8/9. setAliveImplementation2", async function () {

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

            const TestLogicContract = await ethers.getContractAt("TestLogic", rewardPoolProxyContract.address);

            let a = ethers.BigNumber.from("1");
            let b = ethers.BigNumber.from("2");

            let add = await TestLogicContract.sayAdd(a, b);
            expect(add).to.be.eq(a.add(b));

            let mul = await TestLogicContract.sayMul(a, b);
            expect(mul).to.be.eq(a.mul(b));

            tx = await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).setAliveImplementation2(
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

        it("4-1-10. initializeProxy : when not admin, fail", async function () {

            await expect(
                rewardPoolProxyContract.connect(user1).initializeProxy(
                    wtontosPool,
                    info.uniswapV3Factory,
                    info.nonfungiblePositionManager,
                    info.rewardLPTokenManager,
                    info.tosAddress,
                    info.dTosManager,
                    info.policy
                )
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("4-1-11. initializeProxy : only once exceute", async function () {

            await expect(
                rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).initializeProxy(
                    wtontosPool,
                    info.uniswapV3Factory,
                    info.nonfungiblePositionManager,
                    info.rewardLPTokenManager,
                    info.tosAddress,
                    info.dTosManager,
                    info.policy
                )
            ).to.be.revertedWith("already initialized pool");

            expect((await rewardPoolProxyContract.pool()).toLowerCase()).to.be.equal(wtontosPool.toLowerCase());
            expect(await rewardPoolProxyContract.uniswapV3Factory()).to.be.equal(info.uniswapV3Factory);
            expect(await rewardPoolProxyContract.nonfungiblePositionManager()).to.be.equal(info.nonfungiblePositionManager);
            expect(await rewardPoolProxyContract.rewardLPTokenManager()).to.be.equal(info.rewardLPTokenManager);
            expect(await rewardPoolProxyContract.tosAddress()).to.be.equal(info.tosAddress);
            expect(await rewardPoolProxyContract.dtosManagerAddress()).to.be.equal(info.dTosManager);
            expect(await rewardPoolProxyContract.dtosPolicy()).to.be.equal(info.policy);
        });

        it("4-1-12. setProxyPause : when not admin, fail", async function () {

            expect(await rewardPoolProxyContract.isAdmin(user1.address)).to.be.eq(false);
            await expect(
                rewardPoolProxyContract.connect(user1).setProxyPause(true)
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("4-1-12. setProxyPause : only admin", async function () {

            rewardPoolContract = await ethers.getContractAt("RewardPoolSnapshot", rewardPoolProxyContract.address);

            expect(await rewardPoolProxyContract.isAdmin(rewardPoolFactoryInfo.upgradeAdmin.address)).to.be.eq(true);
            expect(await rewardPoolContract["totalSupply()"]()).to.be.eq(ethers.BigNumber.from("0"));

            await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).setProxyPause(true);

            expect(await rewardPoolProxyContract.pauseProxy()).to.be.eq(true);

            await expect(
                rewardPoolContract["totalSupply()"]()
            ).to.be.reverted;

            await rewardPoolProxyContract.connect(rewardPoolFactoryInfo.upgradeAdmin).setProxyPause(false);
            expect(await rewardPoolProxyContract.pauseProxy()).to.be.eq(false);

            expect(await rewardPoolContract["totalSupply()"]()).to.be.eq(ethers.BigNumber.from("0"));
        });
    });

    describe("4-2. RewardPool : Only Admin Functions ", function () {

        it("4-2-1. changeInitializeAddress : when not admin, fail", async function () {

            expect(await rewardPoolContract.isAdmin(user1.address)).to.be.eq(false);
            await expect(rewardPoolContract.connect(user1).changeInitializeAddress(
                info.uniswapV3Factory,
                info.nonfungiblePositionManager,
                info.rewardLPTokenManager,
                info.tosAddress,
                info.dTosManager,
                info.policy
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("4-2-1. changeInitializeAddress ", async function () {

            expect(await rewardPoolContract.isAdmin(rewardPoolFactoryInfo.upgradeAdmin.address)).to.be.eq(true);
            await rewardPoolContract.connect(rewardPoolFactoryInfo.upgradeAdmin).changeInitializeAddress(
                info.uniswapV3Factory,
                info.nonfungiblePositionManager,
                info.rewardLPTokenManager,
                info.tosAddress,
                info.dTosManager,
                info.tosAddress
            );

            await rewardPoolContract.connect(rewardPoolFactoryInfo.upgradeAdmin).changeInitializeAddress(
                info.uniswapV3Factory,
                info.nonfungiblePositionManager,
                info.rewardLPTokenManager,
                info.tosAddress,
                info.dTosManager,
                info.policy
            );

            expect(await rewardPoolContract.uniswapV3Factory()).to.be.equal(info.uniswapV3Factory);
            expect(await rewardPoolContract.nonfungiblePositionManager()).to.be.equal(info.nonfungiblePositionManager);
            expect(await rewardPoolContract.rewardLPTokenManager()).to.be.equal(info.rewardLPTokenManager);
            expect(await rewardPoolContract.tosAddress()).to.be.equal(info.tosAddress);
            expect(await rewardPoolContract.dtosManagerAddress()).to.be.equal(info.dTosManager);
            expect(await rewardPoolContract.dtosPolicy()).to.be.equal(info.policy);

        });

    });

    describe("4-3. RewardPool : Only DTOSManager Functions ", function () {

        it("4-3-1. setDtosBaseRate : when not DTOSManager, fail", async function () {

            expect(await rewardPoolContract.dtosManagerAddress()).to.not.eq(user1.address);
            await expect(rewardPoolContract.connect(user1).setDtosBaseRate(
                ethers.BigNumber.from('2'+'0'.repeat(17))
            )).to.be.revertedWith("caller is not dtosManager");
        });

        it("4-3-1. setDtosBaseRate ", async function () {

            expect(await rewardPoolContract.dtosManagerAddress()).to.be.eq(info.dTosManager);

            expect(await dTosManager.isAdmin(user2.address)).to.be.eq(false);
            await dTosManager.connect(dTosManagerInfo.admin).setDtosBaseRate(
                rewardPoolContract.address,
                policyInfo.initialDtosBaseRate
            );
            expect(await rewardPoolContract.uniswapV3Factory()).to.be.equal(info.uniswapV3Factory);

        });

        it("4-3-1 / 2-1-7. setDtosBaseRate : when not dTosManager's admin(DAO), fail", async function () {
            expect(await dTosManager.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManager.connect(user2).setDtosBaseRate(
                rewardPoolContract.address,
                policyInfo.initialDtosBaseRate
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("4-3-1 / 2-1-7. setDtosBaseRate only dTosManager's admin(DAO) ", async function () {
            expect(await dTosManager.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);
            await dTosManager.connect(dTosManagerInfo.admin).setDtosBaseRate(
                rewardPoolContract.address,
                policyInfo.initialDtosBaseRate
            );

            expect(await dTosManager.dtosBaseRate(rewardPoolContract.address)).to.be.eq(policyInfo.initialDtosBaseRate);

        });

        it("4-3-2 / 2-1-6. setReabseInfo : when not dTosManager's admin(DAO), fail", async function () {
            expect(await dTosManager.isAdmin(user2.address)).to.be.eq(false);
            await expect(dTosManager.connect(user2).setReabseInfo(
                rewardPoolContract.address,
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("4-3-2 / 2-1-6. setReabseInfo only dTosManager's admin(DAO) ", async function () {
            expect(await dTosManager.isAdmin(dTosManagerInfo.admin.address)).to.be.eq(true);

            // expect(await rewardPoolContract.rebaseIntervalSecond()).to.not.eq(policyInfo.initialRebaseIntervalSecond);
            //expect(await rewardPoolContract.interestRatePerRebase()).to.not.eq(policyInfo.initialInterestRatePerRebase);

            await dTosManager.connect(dTosManagerInfo.admin).setReabseInfo(
                rewardPoolContract.address,
                policyInfo.initialRebaseIntervalSecond,
                ethers.BigNumber.from('2'+'0'.repeat(16))
            );

            await dTosManager.connect(dTosManagerInfo.admin).setReabseInfo(
                rewardPoolContract.address,
                policyInfo.initialRebaseIntervalSecond,
                policyInfo.initialInterestRatePerRebase
            );
            expect(await dTosManager.initialRebaseIntervalSecond()).to.be.eq(policyInfo.initialRebaseIntervalSecond);
            expect(await dTosManager.initialInterestRatePerRebase()).to.be.eq(policyInfo.initialInterestRatePerRebase);
        });

    });

    describe("4-5. RewardPool : Any can execute  ", function () {

        it("1-1-4. policy.execPause  : when not admin, fail", async function () {
            expect(await policy.isAdmin(user2.address)).to.be.eq(false);
            await expect(policy.connect(user2).execPause(rewardPoolContract.address, true)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-1-4. policy.execPause  only policy.admin ", async function () {
            expect(await policy.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await policy.connect(policyInfo.admin).execPause(rewardPoolContract.address, true);
            expect(await rewardPoolContract.execPauseFlag()).to.be.eq(true);
        });

        it("4-5-4 / 4-4-1. stake : when pause, fail", async function () {
            await expect(
                rewardPoolContract.connect(user1).stake(lpWTONTOS_tokenId_admin)
            ).to.be.revertedWith("exec pause");

            await policy.connect(policyInfo.admin).execPause(rewardPoolContract.address, false);
            expect(await rewardPoolContract.execPauseFlag()).to.be.eq(false);
        });

        it("4-5-1. stake : when not LP owner, fail", async function () {

            await expect(
                rewardPoolContract.connect(user1).stake(admin_tokens.token_normal)
            ).to.be.revertedWith("tokenId is not yours.");
        });

        it("4-5-1. stake : when LP didn't be approved before, fail", async function () {
            await expect(
                rewardPoolContract.connect(admin).stake(admin_tokens.token_normal)
            ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        });

        it("4-5-2/3/4 / 4-8-1. stake after approve", async function () {
            let stakedTokenId = admin_tokens.token_normal;
            let staker = admin;

            let tokenCountPrev = await rewardLPTokenManager.userTokenCount(staker.address);

            let abi = require("../abis/NonfungiblePositionManager.json").abi;
            nonfungiblePositionManager = await ethers.getContractAt(abi, info.nonfungiblePositionManager);

            let approved = await nonfungiblePositionManager.isApprovedForAll(staker.address, rewardPoolContract.address);
            if (!approved)
                await nonfungiblePositionManager.connect(staker).setApprovalForAll(rewardPoolContract.address, true);

            await rewardPoolContract.connect(staker).stake(stakedTokenId);

            let tokenCountAfter = await rewardLPTokenManager.userTokenCount(staker.address);

            let tokensOfOwner = await rewardLPTokenManager.tokensOfOwner(staker.address);

            expect(tokenCountAfter).to.be.eq(tokenCountPrev.add(ethers.BigNumber.from("1")));

            let rTokenId = await rewardLPTokenManager.userToken(staker.address, tokenCountPrev);
            let rTokenIdInfo = await rewardLPTokenManager.deposits(rTokenId);
            let tokenId = rTokenIdInfo.poolTokenId;
            expect(tokenId).to.be.eq(stakedTokenId);

            rewardLPTokenManagerInfo.lists.push({
                id: rTokenId,
                owner: staker,
                info: rTokenIdInfo
            });

            //let rTokenId = await rewardPoolContract.rewardLPs(tokenId);
            expect(await rewardPoolContract.rewardLPs(tokenId)).to.be.eq(rTokenId);

            let baseAmount = await rewardPoolContract.tosToDtosAmount(rTokenIdInfo.tosAmount);
            let baseRate = await rewardPoolContract.dTosBaseRate();

            expect(rTokenIdInfo.rewardPool).to.be.eq(rewardPoolContract.address);
            expect(rTokenIdInfo.owner).to.be.eq(staker.address);
            expect(rTokenIdInfo.poolTokenId).to.be.eq(tokenId);
            expect(rTokenIdInfo.tosAmount).to.be.gt(zeroBN);
            expect(rTokenIdInfo.usedAmount).to.be.eq(zeroBN);
            expect(rTokenIdInfo.stakedTime).to.be.gt(zeroBN);
            expect(rTokenIdInfo.factoredAmount).to.be.gte(baseAmount);

            if (baseRate.eq(zeroBN)){
                expect(baseAmount).to.be.eq(zeroBN);
                expect(await rewardPoolContract.balanceOf(staker.address)).to.be.eq(zeroBN);
            } else {
                expect(baseAmount).to.be.gt(zeroBN);
                expect(await rewardPoolContract.balanceOf(staker.address)).to.be.gt(zeroBN);
            }

            expect(await rewardPoolContract.balanceOf(staker.address)).to.be.eq(await rewardPoolContract.totalSupply());

        });


        it("4-5-2/3/4 / 4-8-1.  stake  ", async function () {
            let stakedTokenId = admin_tokens.token_normal2;
            let staker = admin;

            let tokenCountPrev = await rewardLPTokenManager.userTokenCount(staker.address);

            let abi = require("../abis/NonfungiblePositionManager.json").abi;
            nonfungiblePositionManager = await ethers.getContractAt(abi, info.nonfungiblePositionManager);

            let approved = await nonfungiblePositionManager.isApprovedForAll(staker.address, rewardPoolContract.address);
            if (!approved)
                await nonfungiblePositionManager.connect(staker).setApprovalForAll(rewardPoolContract.address, true);

            await rewardPoolContract.connect(staker).stake(stakedTokenId);

            let tokenCountAfter = await rewardLPTokenManager.userTokenCount(staker.address);

            let tokensOfOwner = await rewardLPTokenManager.tokensOfOwner(staker.address);

            expect(tokenCountAfter).to.be.eq(tokenCountPrev.add(ethers.BigNumber.from("1")));

            let rTokenId = await rewardLPTokenManager.userToken(staker.address, tokenCountPrev);
            let rTokenIdInfo = await rewardLPTokenManager.deposits(rTokenId);
            let tokenId = rTokenIdInfo.poolTokenId;
            expect(tokenId).to.be.eq(stakedTokenId);

            rewardLPTokenManagerInfo.lists.push({
                id: rTokenId,
                owner: staker,
                info: rTokenIdInfo
            });

            //let rTokenId = await rewardPoolContract.rewardLPs(tokenId);
            expect(await rewardPoolContract.rewardLPs(tokenId)).to.be.eq(rTokenId);

            let baseAmount = await rewardPoolContract.tosToDtosAmount(rTokenIdInfo.tosAmount);
            let baseRate = await rewardPoolContract.dTosBaseRate();

            expect(rTokenIdInfo.rewardPool).to.be.eq(rewardPoolContract.address);
            expect(rTokenIdInfo.owner).to.be.eq(staker.address);
            expect(rTokenIdInfo.poolTokenId).to.be.eq(tokenId);
            expect(rTokenIdInfo.tosAmount).to.be.gt(zeroBN);
            expect(rTokenIdInfo.usedAmount).to.be.eq(zeroBN);
            expect(rTokenIdInfo.stakedTime).to.be.gt(zeroBN);
            expect(rTokenIdInfo.factoredAmount).to.be.gte(baseAmount);

            if (baseRate.eq(zeroBN)){
                expect(baseAmount).to.be.eq(zeroBN);
                expect(await rewardPoolContract.balanceOf(staker.address)).to.be.eq(zeroBN);
            } else {
                expect(baseAmount).to.be.gt(zeroBN);
                expect(await rewardPoolContract.balanceOf(staker.address)).to.be.gt(zeroBN);
            }

            expect(await rewardPoolContract.balanceOf(staker.address)).to.be.eq(await rewardPoolContract.totalSupply());

        });


        it("4-5-1. stake : when LP is zero liquidity, fail", async function () {
            let stakedTokenId = user1_tokens.zeroliquidity;
            //let ownerOf = await nonfungiblePositionManager.ownerOf(stakedTokenId);

            let approved = await nonfungiblePositionManager.isApprovedForAll(user1.address, rewardPoolContract.address);
            if (!approved)
                await nonfungiblePositionManager.connect(user1).setApprovalForAll(rewardPoolContract.address, true);

            await expect(
                rewardPoolContract.connect(user1).stake(stakedTokenId)
            ).to.be.revertedWith("zero liquidity");
        });

        it("4-5-1. stake : when LP is in other pool, fail", async function () {
            let stakedTokenId = admin_tokens.token_otherpool;
            //let ownerOf = await nonfungiblePositionManager.ownerOf(stakedTokenId);

            await expect(
                rewardPoolContract.connect(admin).stake(stakedTokenId)
            ).to.be.revertedWith("different pool's token");
        });
        /*
        it("4-5-1. stake : when LP is out of range, fail", async function () {
            let stakedTokenId = admin_tokens.token_outofrange;
            let ownerOf = await nonfungiblePositionManager.ownerOf(stakedTokenId);

            await expect(
                rewardPoolContract.connect(admin).stake(stakedTokenId)
            ).to.be.revertedWith("out of range");
        });
        */

        it("4-5-1 / 4-8-1. stake : can stake with nonfungiblePositionManager.safeTransferFrom method ", async function () {
            let stakedTokenId = user1_tokens.token_normal;
            let staker = user1;

            let tokenCountPrev = await rewardLPTokenManager.userTokenCount(staker.address);

            let tx = await nonfungiblePositionManager.connect(staker)["safeTransferFrom(address,address,uint256)"](
                staker.address,
                rewardPoolContract.address,
                stakedTokenId);

            await tx.wait();

            let tokenCountAfter = await rewardLPTokenManager.userTokenCount(staker.address);

            let tokensOfOwner = await rewardLPTokenManager.tokensOfOwner(staker.address);

            expect(tokenCountAfter).to.be.eq(tokenCountPrev.add(ethers.BigNumber.from("1")));

            let rTokenId = await rewardLPTokenManager.userToken(staker.address, tokenCountPrev);
            let rTokenIdInfo = await rewardLPTokenManager.deposits(rTokenId);
            let tokenId = rTokenIdInfo.poolTokenId;
            expect(tokenId).to.be.eq(stakedTokenId);

            rewardLPTokenManagerInfo.lists.push({
                id: rTokenId,
                owner: staker,
                info: rTokenIdInfo
            });

            //let rTokenId = await rewardPoolContract.rewardLPs(tokenId);
            expect(await rewardPoolContract.rewardLPs(tokenId)).to.be.eq(rTokenId);

            let baseAmount = await rewardPoolContract.tosToDtosAmount(rTokenIdInfo.tosAmount);
            let baseRate = await rewardPoolContract.dTosBaseRate();

            expect(rTokenIdInfo.rewardPool).to.be.eq(rewardPoolContract.address);
            expect(rTokenIdInfo.owner).to.be.eq(staker.address);
            expect(rTokenIdInfo.poolTokenId).to.be.eq(tokenId);
            expect(rTokenIdInfo.tosAmount).to.be.gt(zeroBN);
            expect(rTokenIdInfo.usedAmount).to.be.eq(zeroBN);
            expect(rTokenIdInfo.stakedTime).to.be.gt(zeroBN);
            expect(rTokenIdInfo.factoredAmount).to.be.gte(baseAmount);

            if (baseRate.eq(zeroBN)){
                expect(baseAmount).to.be.eq(zeroBN);
                expect(await rewardPoolContract.balanceOf(staker.address)).to.be.eq(zeroBN);
            } else {
                expect(baseAmount).to.be.gt(zeroBN);
                expect(await rewardPoolContract.balanceOf(staker.address)).to.be.gt(zeroBN);
            }

            expect(await rewardPoolContract.balanceOf(staker.address)).to.be.lt(
                await rewardPoolContract.totalSupply());

        });

    });

    describe("4-6. RewardPool : Only RewardLPTokenManager ", function () {

        it("4-6-1. transferFrom : if not through rewardLPTokenManager, fail ", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let owner = nft.owner;
            let nftId = nft.id;
            expect(await rewardLPTokenManager.ownerOf(nftId)).to.be.eq(owner.address);

            await expect(
                rewardPoolContract.connect(owner).transferFrom(
                    owner.address,
                    user3.address,
                    nft.info.poolTokenId,
                    nft.info.tosAmount,
                    nft.info.factoredAmount
                    )
           ).to.be.revertedWith("sender is not rewardLPTokenManager.");
        });
    });


    describe("4-9. RewardLPTokenManager : Any can execute  ", function () {

        it("4-9-1. use : if sender doesn't have a permission(USER_ROLE), fail ", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let nonStaker = user2;
            expect(await rewardLPTokenManager.hasRole(keccak256("USER_ROLE"), user2.address)).to.be.eq(false);

            await expect(
                 rewardLPTokenManager.connect(nonStaker).use(nft.id, nft.info.tosAmount)
            ).to.be.revertedWith("RewardLPTokenManager: must have user role to use");
        });

        it("4-9-1 / 4-9-3. use ", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let nonStaker = user2;

            expect(await rewardLPTokenManager.hasRole(keccak256("USER_ROLE"), user2.address)).to.be.eq(false);

            await rewardLPTokenManager.connect(rewardLPTokenManagerInfo.admin).grantRole(keccak256("USER_ROLE"), user2.address);
            expect(await rewardLPTokenManager.hasRole(keccak256("USER_ROLE"), user2.address)).to.be.eq(true);

            let f = await rewardPoolContract.getFactor();

            let usable = nft.info.factoredAmount.mul(f).div(etherBN);
            let usableAmount = await rewardLPTokenManager.usableAmount(nft.id);
            expect(usable).to.be.eq(usableAmount);

            await rewardLPTokenManager.connect(user2).use(nft.id, usableAmount);

            expect(await rewardLPTokenManager.usableAmount(nft.id)).to.be.eq(zeroBN);
        });

        it("4-9-2 / 4-9-4. multiUse ", async function () {
            let nftIds = [];
            let usables = [];
            let nonStaker = user2;

            expect(await rewardLPTokenManager.hasRole(keccak256("USER_ROLE"), user2.address)).to.be.eq(true);
            let f = await rewardPoolContract.getFactor();

            for(let i = 0; i < (rewardLPTokenManagerInfo.lists.length-1); i++){
                expect(await rewardLPTokenManager.usableAmount(rewardLPTokenManagerInfo.lists[i].id)).to.be.gt(zeroBN);
                nftIds.push(rewardLPTokenManagerInfo.lists[i].id);
                usables.push(rewardLPTokenManagerInfo.lists[i].info.factoredAmount.mul(f).div(etherBN));
            }
            let usableAmounts = await rewardLPTokenManager.usableAmounts(nftIds);

            for(let i = 0; i < nftIds.length; i++){
                expect(usableAmounts[i]).to.be.eq(usables[i]);
            }

            await rewardLPTokenManager.connect(user2).multiUse(nftIds, usableAmounts);

            for(let i = 0; i < (rewardLPTokenManagerInfo.lists.length-1); i++){
                expect(await rewardLPTokenManager.usableAmount(rewardLPTokenManagerInfo.lists[i].id)).to.be.eq(zeroBN);
            }
        });

        it("4-9-5. transferFrom : if not NFT's owner, fail  ", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let owner = nft.owner;
            let nftId = nft.id;

            expect(user2.address).to.not.eq(owner.address);
            expect(await rewardLPTokenManager.ownerOf(nftId)).to.not.eq(user2.address);

            await expect(
                rewardLPTokenManager.connect(user2).transferFrom(user2.address, user3.address, nftId)
           ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        });

        it("1-1-4. policy.execPause  only policy.admin ", async function () {
            expect(await policy.isAdmin(policyInfo.admin.address)).to.be.eq(true);
            await policy.connect(policyInfo.admin).execPause(rewardPoolContract.address, true);
            expect(await rewardPoolContract.execPauseFlag()).to.be.eq(true);
        });

        it("4-9-6. transferFrom : if rewardPoolContract.execPauseFlag is true, fail ", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let owner = nft.owner;
            let nftId = nft.id;
            expect(await rewardLPTokenManager.ownerOf(nftId)).to.be.eq(owner.address);

            await expect(
                rewardPoolContract.connect(owner).transferFrom(
                    owner.address,
                    user3.address,
                    nft.info.poolTokenId,
                    nft.info.tosAmount,
                    nft.info.factoredAmount
                    )
            ).to.be.revertedWith("exec pause");

            await expect(
                rewardLPTokenManager.connect(owner).transferFrom(owner.address, user3.address, nftId)
            ).to.be.revertedWith("exec pause");

            await policy.connect(policyInfo.admin).execPause(rewardPoolContract.address, false);
            expect(await rewardPoolContract.execPauseFlag()).to.be.eq(false);
        });

        it("4-9-5 / 4-6-1. transferFrom : only NFT's Owner through rewardLPTokenManager", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let owner = nft.owner;
            let nftId = nft.id;
            expect(await rewardLPTokenManager.ownerOf(nftId)).to.be.eq(owner.address);

            let balanceOfBeforeFrom = await dTosManager["balanceOf(address)"](owner.address);
            let balanceOfBeforeTo = await dTosManager["balanceOf(address)"](user3.address);
            expect(balanceOfBeforeFrom).to.be.gt(zeroBN);
            expect(balanceOfBeforeTo).to.be.eq(zeroBN);

            await rewardLPTokenManager.connect(owner).transferFrom(owner.address, user3.address, nftId);

            expect(await rewardLPTokenManager.ownerOf(nftId)).to.be.eq(user3.address);
            let balanceOfAfterFrom = await dTosManager["balanceOf(address)"](owner.address);
            let balanceOfAfterTo = await dTosManager["balanceOf(address)"](user3.address);
            expect(balanceOfAfterFrom).to.be.lt(balanceOfBeforeFrom);
            expect(balanceOfAfterTo).to.be.eq(balanceOfBeforeFrom.sub(balanceOfAfterFrom));

            rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1].owner = user3;
        });
    });


    describe("4-5. RewardPool : Any can execute  ", function () {

        it("4-5-5. rebase : if it hasn't passed a epoch period, does not run the rebase.", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let owner = nft.owner;
            let nftId = nft.id;

            let factor = await rewardPoolContract.getFactor();

            await rewardLPTokenManager.connect(owner).transferFrom(owner.address, user1.address, nftId);
            expect( await rewardPoolContract.getFactor()).to.be.eq(factor);

            rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1].owner = user1;
        });


        it("        pass blocks", async function () {
            let rebaseIntervalSecond = await rewardPoolContract.rebaseIntervalSecond();
            let passTime =  rebaseIntervalSecond.toNumber() ;

            await ethers.provider.send("evm_increaseTime", [passTime]);
            await ethers.provider.send("evm_mine");

            // let block = await ethers.provider.getBlock();
            // console.log('block2',block);
        });

        it("4-5-5. rebase : if it has passed a epoch period, does run the rebase.", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let owner = nft.owner;
            let nftId = nft.id;

            let factor = await rewardPoolContract.getFactor();

            await rewardLPTokenManager.connect(owner).transferFrom(owner.address, user3.address, nftId);
            expect(await rewardPoolContract.getFactor()).to.be.gt(factor);
            expect(await rewardPoolContract.lastRebaseTime()).to.be.gt(zeroBN);
            expect(await rewardLPTokenManager.usableAmount(nftId)).to.be.gt(zeroBN);

            rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1].owner = user3;
        });

    });

    describe("4-5. RewardPool : Any can execute  ", function () {

        it("4-5-9. unstake : if sender is not NFT owner, fail", async function () {
            let nft = rewardLPTokenManagerInfo.lists[rewardLPTokenManagerInfo.lists.length-1];
            let owner = nft.owner;
            let nftId = nft.id;
            expect(await rewardLPTokenManager.ownerOf(nftId)).to.not.eq(user1.address);

            await expect(
                rewardPoolContract.connect(user1).unstake(nft.info.poolTokenId)
            ).to.be.revertedWith("not owner");
        });

    });

    /*
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
