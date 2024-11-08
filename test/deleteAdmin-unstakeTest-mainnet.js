const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const chai = require("chai");
const { solidity } = require("ethereum-waffle");

const { expect, assert } = chai;
chai.use(solidity);
require("chai").should();

const Web3EthAbi = require('web3-eth-abi');
// const { padLeft } = require('web3-utils');

const lockTOSPRoxyABI = require("../abis/LockTOSProxy.json").abi;
const BondDepositoryProxyABI = require("../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json").abi;
const BondDepositoryLogicABI = require("../artifacts/contracts/BondDepository.sol/BondDepository.json").abi;
const StakingV2ProxyABI = require("../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json").abi;
const TreasuryProxyABI = require("../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json").abi;
const TOSABI = require("../abis/TOS.json").abi;
const StakingV2LogicABI = require("../artifacts/contracts/StakingV2.sol/StakingV2.json").abi;
const TreasuryLogicV1ABI = require("../artifacts/contracts/TreasuryV1_1.sol/TreasuryV1_1.json").abi;


describe("Admin Test(Mainnet)", () => {

    let contractAdminAddress = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1"
    let contractAdmin;
    let permissionsAdminAddress = "0x12A936026F072d4e97047696A9d11F97Eae47d21"
    let permissionsAdmin;

    let richTOSAddress = "0x36f917BBd70d31F0501fCe2Cd1756A977d783E44"
    let richTOS;
    let user1Address = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea"
    let user1;
    let user2Address = "0x3bFda92Fa3bC0AB080Cac3775147B6318b1C5115"
    let user2;

    let admin1;

    let LockTOSProxyAddr = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
    let BondDepositoryProxyAddr = "0xbf715e63d767D8378102cdD3FFE3Ce2BF1E02c91"
    let StakingV2ProxyAddr = "0x14fb0933Ec45ecE75A431D10AFAa1DDF7BfeE44C"
    let TreasuryProxyAddr = "0xD27A68a457005f822863199Af0F817f672588ad6"
    let TreasuryProxyAddr2 = "0x11176e6e3fE72130Fd96b0b38Cf95B0f0C2C36fC"
    let TOSAddr = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153"

    let LockTOSProxy;
    let BondDepositoryProxy;
    let BondDepositoryLogic;
    let StakingV2Proxy;
    let TreasuryProxy;
    let TreasuryProxy2;
    let TOS;
    let StakingV2Logic;
    let StakingV2Logic2;
    let TreasuryLogicV1;
    let libStaking;
    
    let minimumAmount = ethers.utils.parseUnits("100000", 18);
    let user1TOSstaking = ethers.utils.parseUnits("20", 18);    //20TOS staking
    let claimTOSAmount = ethers.utils.parseUnits("90000", 18);
    let relockAmount = ethers.utils.parseUnits("60", 18);

    let stakeIdcheck;
    let ltosAmount;
    let stakeinfo;
    let claimableLtos;

    let beforeEpochTime;
    let afterEpochTime;


    let uniswapInfo={
        poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
        swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        wethUsdcPool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
        tosethPool: "0x2ad99c938471770da0cd60e08eaf29ebff67a92a",
        wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
        wtonTosPool: "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4",
        tosDOCPool: "0x369bca127b8858108536b71528ab3befa1deb6fc",
        wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
        tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        doc: "0x0e498afce58de8651b983f136256fa3b8d9703bc",
        _fee: ethers.BigNumber.from("3000"),
        NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
    }

    //[팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격, 한번에 구매 가능한 TOS물량]
    // 이더상품.
    let bondInfoEther = {
        marketId : null,
        check: true,
        token: ethers.constants.AddressZero,
        poolAddress: uniswapInfo.tosethPool,
        fee: 0,
        market: {
        capAmountOfTos: ethers.BigNumber.from("30400000000000000000000"),
        closeTime: 1669852800,
        priceTosPerToken: ethers.BigNumber.from("3015716000000000000000"),
        purchasableTOSAmountAtOneTime: ethers.BigNumber.from("822468000000000000000")
        },
        tosValuationSimple: 0,
        tosValuationLock: 0
    }


    let stakeId = [
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


    before('account setting', async () => {
        // accounts = await ethers.getSigners();
        // [admin1] = accounts;
        // console.log('admin1',admin1.address);


        await hre.network.provider.send("hardhat_impersonateAccount", [
            contractAdminAddress,
        ]);
        contractAdmin = await hre.ethers.getSigner(contractAdminAddress);

        await hre.network.provider.send("hardhat_impersonateAccount", [
            permissionsAdminAddress,
        ]);
        permissionsAdmin = await hre.ethers.getSigner(permissionsAdminAddress);

        await hre.network.provider.send("hardhat_impersonateAccount", [
            richTOSAddress,
        ]);
        richTOS = await hre.ethers.getSigner(richTOSAddress);

        await hre.network.provider.send("hardhat_impersonateAccount", [
            user1Address,
        ]);
        user1 = await hre.ethers.getSigner(user1Address);

        await hre.network.provider.send("hardhat_impersonateAccount", [
            user2Address,
        ]);
        user2 = await hre.ethers.getSigner(user2Address);

        // await hre.ethers.provider.send("hardhat_setBalance", [
        //     admin1.address,
        //     "0x8ac7230489e80000",
        // ]);
        
        await hre.ethers.provider.send("hardhat_setBalance", [
            contractAdmin.address,
            "0x8ac7230489e80000",
        ]);
        await hre.ethers.provider.send("hardhat_setBalance", [
            permissionsAdmin.address,
            "0x8ac7230489e80000",
        ]);
        await hre.ethers.provider.send("hardhat_setBalance", [
            richTOS.address,
            "0x8ac7230489e80000",
        ]);
        await hre.ethers.provider.send("hardhat_setBalance", [
            user1.address,
            "0x8ac7230489e80000",
        ]);
        await hre.ethers.provider.send("hardhat_setBalance", [
            user2.address,
            "0x8ac7230489e80000",
        ]);
    })

    describe("Set Contract", () => {
        it("Set LockTOSProxy", async () => {
            LockTOSProxy = new ethers.Contract(
                LockTOSProxyAddr,
                lockTOSPRoxyABI,
                contractAdmin
            )
        })

        it("Set BondDepositoryProxy", async () => {
            BondDepositoryProxy = new ethers.Contract(
                BondDepositoryProxyAddr,
                BondDepositoryProxyABI,
                contractAdmin
            )
        })

        it("Set StakingV2Proxy", async () => {
            StakingV2Proxy = new ethers.Contract(
                StakingV2ProxyAddr,
                StakingV2ProxyABI,
                contractAdmin
            )
        })

        it("Set TreasuryProxy", async () => {
            TreasuryProxy = new ethers.Contract(
                TreasuryProxyAddr,
                TreasuryProxyABI,
                contractAdmin
            )
        })

        it("Set TreasuryProxy2", async () => {
            TreasuryProxy2 = new ethers.Contract(
                TreasuryProxyAddr2,
                TreasuryProxyABI,
                contractAdmin
            )
        })

        it("Set TOS", async () => {
            TOS = new ethers.Contract(
                TOSAddr,
                TOSABI,
                contractAdmin
            )
        })

        it("Set BondDepositoryLogic", async () => {
            BondDepositoryLogic = new ethers.Contract(
                BondDepositoryProxyAddr,
                BondDepositoryLogicABI,
                contractAdmin
            )
        })

        it("Set TreasuryLogicV1", async () => {
            TreasuryLogicV1 = new ethers.Contract(
                TreasuryProxyAddr,
                TreasuryLogicV1ABI,
                contractAdmin
            )
        })
    })

    describe("Deploy & Setting Contract", () => {
        it("Deploy the LibStaking", async () => {
            const libStakingDep = await ethers.getContractFactory("LibStaking");
            libStaking = await libStakingDep.deploy();

            await libStaking.deployed();
        })
        it("Deploy the StakingV2", async () => {
            const StakingV2Logic2Dep = await ethers.getContractFactory("StakingV2", {
                libraries: {
                    LibStaking: libStaking.address,
                },
            });
            StakingV2Logic2 = await StakingV2Logic2Dep.deploy();

            await StakingV2Logic2.deployed();
        })

        it("upgradeTo StakingV2", async () => {
            let checkImpleAddress = await StakingV2Proxy.proxyImplementation(0);
            expect(checkImpleAddress).to.not.equal(StakingV2Logic2.address)
            
            await StakingV2Proxy.connect(contractAdmin).upgradeTo(StakingV2Logic2.address);
            
            checkImpleAddress = await StakingV2Proxy.proxyImplementation(0);
            expect(checkImpleAddress).to.be.equal(StakingV2Logic2.address)
        })

        it("Set StakingV2Logic", async () => {
            StakingV2Logic = new ethers.Contract(
                StakingV2ProxyAddr,
                StakingV2LogicABI,
                contractAdmin
            )
        })
    })

    describe("remove the authority", () => {
        it("LockTOSProxy removeAdmin", async () => {
            let check = await LockTOSProxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(true)
            await LockTOSProxy.connect(contractAdmin).removeAdmin(contractAdmin.address)
            check = await LockTOSProxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(false)
        })

        it("BondDepositoryProxy removePolicy, removeAdmin, removeProxyAdmin", async () => {
            let check = await BondDepositoryProxy.isPolicy(contractAdmin.address)
            expect(check).to.be.equal(true)
            await BondDepositoryProxy.connect(contractAdmin).removePolicy()
            check = await BondDepositoryProxy.isPolicy(contractAdmin.address)
            expect(check).to.be.equal(false)
            
            check = await BondDepositoryProxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(true)
            await BondDepositoryProxy.connect(contractAdmin).removeAdmin()
            check = await BondDepositoryProxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(false)

            check = await BondDepositoryProxy.isProxyAdmin(contractAdmin.address)
            expect(check).to.be.equal(true)
            await BondDepositoryProxy.connect(contractAdmin).removeProxyAdmin()
            check = await BondDepositoryProxy.isProxyAdmin(contractAdmin.address)
            expect(check).to.be.equal(false)
        })

        it("StakingV2Proxy removePolicy, removeAdmin, removeProxyAdmin", async () => {
            let check = await StakingV2Proxy.isPolicy(contractAdmin.address)
            expect(check).to.be.equal(true)
            await StakingV2Proxy.connect(contractAdmin).removePolicy()
            check = await StakingV2Proxy.isPolicy(contractAdmin.address)
            expect(check).to.be.equal(false)
            
            check = await StakingV2Proxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(true)
            await StakingV2Proxy.connect(contractAdmin).removeAdmin()
            check = await StakingV2Proxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(false)

            check = await StakingV2Proxy.isProxyAdmin(contractAdmin.address)
            expect(check).to.be.equal(true)
            await StakingV2Proxy.connect(contractAdmin).removeProxyAdmin()
            check = await StakingV2Proxy.isProxyAdmin(contractAdmin.address)
            expect(check).to.be.equal(false)
        })

        it("TreasuryProxy removePolicy, removeAdmin, removeProxyAdmin", async () => {
            let check = await TreasuryProxy.isPolicy(contractAdmin.address)
            expect(check).to.be.equal(true)
            await TreasuryProxy.connect(contractAdmin).removePolicy()
            check = await TreasuryProxy.isPolicy(contractAdmin.address)
            expect(check).to.be.equal(false)
            
            check = await TreasuryProxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(true)
            await TreasuryProxy.connect(contractAdmin).removeAdmin()
            check = await TreasuryProxy.isAdmin(contractAdmin.address)
            expect(check).to.be.equal(false)

            check = await TreasuryProxy.isProxyAdmin(contractAdmin.address)
            expect(check).to.be.equal(true)
            await TreasuryProxy.connect(contractAdmin).removeProxyAdmin()
            check = await TreasuryProxy.isProxyAdmin(contractAdmin.address)
            expect(check).to.be.equal(false)
        })
    })

    describe("remove Permissions", () => {
        it("TOS removeBurner TreasuryProxy2", async () => {
            let check = await TOS.isBurner(TreasuryProxyAddr2)
            expect(check).to.be.equal(true)
            await TOS.connect(permissionsAdmin).removeBurner(TreasuryProxyAddr2)
            check = await TOS.isBurner(TreasuryProxyAddr2)
            expect(check).to.be.equal(false)
        })

        it("TOS removeMinter TreasuryProxy", async () => {
            let check = await TOS.isMinter(TreasuryProxyAddr)
            expect(check).to.be.equal(true)
            await TOS.connect(permissionsAdmin).removeMinter(TreasuryProxyAddr)
            check = await TOS.isMinter(TreasuryProxyAddr)
            expect(check).to.be.equal(false)
        })

        it("TOS removeMinter TreasuryProxy2", async () => {
            let check = await TOS.isMinter(TreasuryProxyAddr2)
            expect(check).to.be.equal(true)
            await TOS.connect(permissionsAdmin).removeMinter(TreasuryProxyAddr2)
            check = await TOS.isMinter(TreasuryProxyAddr2)
            expect(check).to.be.equal(false)
        })

        it("TOS removeAdmin", async () => {
            let check = await TOS.isAdmin(permissionsAdmin.address)
            expect(check).to.be.equal(true)
            await TOS.connect(permissionsAdmin).removeAdmin(permissionsAdmin.address)
            check = await TOS.isAdmin(permissionsAdmin.address)
            expect(check).to.be.equal(false)
        })


    })

    describe("functions Test", () => {
        it("Send TOS, user1, user", async () => {
            await TOS.connect(richTOS).transfer(user1Address,minimumAmount)
            await TOS.connect(richTOS).transfer(user2Address,minimumAmount)
        })
        
        it("check possibleIndex", async () => {
            let possibleIndex = await StakingV2Logic.possibleIndex()
            console.log("possibleIndex :", possibleIndex)
        })

        it('increase block time', async function () {
            const block = await ethers.provider.getBlock('latest')
            // console.log(block.timestamp);
            let epochTimeStamp = 1934460995
            let diffTime = Number(epochTimeStamp)-Number(block.timestamp);
            // console.log(diffTime)

            ethers.provider.send("evm_increaseTime", [diffTime+10])
            ethers.provider.send("evm_mine")
        });

        it("check possibleIndex", async () => {
            beforeEpochTime = await StakingV2Logic.possibleIndex()
            console.log("beforeEpochTime :", beforeEpochTime)
        })

        it('increase block time', async function () {
            const block = await ethers.provider.getBlock('latest')
            // console.log(block.timestamp);
            let diffTime = 3600 * 8
            // console.log(diffTime)

            ethers.provider.send("evm_increaseTime", [diffTime+10])
            ethers.provider.send("evm_mine")
        });

        it("check possibleIndex", async () => {
            afterEpochTime = await StakingV2Logic.possibleIndex()
            console.log("afterEpochTime :", afterEpochTime)
            expect(afterEpochTime).to.be.equal(beforeEpochTime)
        })


        it("stakeId Length", async () => {
            console.log(stakeId.length)
        })

        // it("stakeId Info", async () => {
        //     let stakeInfo = await StakingV2Logic.allStakings(stakeId[0])
        //     console.log(stakeInfo)
        //     let getTOSamount = await StakingV2Logic.getLtosToTos(stakeInfo.ltos)
        //     console.log(getTOSamount)
        //     console.log(stakeInfo.deposit)
        // })

        it("allStakeId forceUnstake", async () => {
            for(let i = 0; i < stakeId.length; i++) {
                // console.log("i : ", i);
                console.log("stakeId[", i, "] : ", stakeId[i]);
                await StakingV2Logic.connect(user1).forceUnstake(stakeId[i]);
                console.log("unstake Done");
            }
        })



    })


})