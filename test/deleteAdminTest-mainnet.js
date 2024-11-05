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
    
    let minimumAmount = ethers.utils.parseUnits("1000", 18);
    let user1TOSstaking = ethers.utils.parseUnits("20", 18);    //20TOS staking

    let stakeIdcheck;
    let ltosAmount;
    let stakeinfo;
    let claimableLtos;


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

        it("Set StakingV2Logic", async () => {
            StakingV2Logic = new ethers.Contract(
                StakingV2ProxyAddr,
                StakingV2LogicABI,
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

        it("Add Stake Test", async () => {
            let user1tosBalance = await TOS.balanceOf(user1.address);
            console.log("user1tosBalance :",user1tosBalance);

            await TOS.connect(user1).approve(StakingV2Logic.address,user1TOSstaking);

            await StakingV2Logic.connect(user1).stake(
                user1TOSstaking
            )
        })

        it("stakingOf view test", async () => {
            stakeIdcheck = await StakingV2Logic.stakingOf(user1.address);
            console.log("stakeId :", stakeIdcheck);
            console.log("stakeId :", Number(stakeIdcheck[0]));
            console.log("stakeId :", Number(stakeIdcheck[1]));
        })

        it("balanceOf view test", async () => {
            ltosAmount = await StakingV2Logic.balanceOf(user1.address)
            console.log("stakeId :", Number(ltosAmount));
        })

        it("stakedOf view test", async () => {
            ltosAmount = await StakingV2Logic.stakedOf(Number(stakeIdcheck[1]))
            console.log("ltosAmount :", Number(ltosAmount));
        })

        it("stakeInfo view test", async () => {
            stakeinfo = await StakingV2Logic.stakeInfo(Number(stakeIdcheck[1]))
            console.log("stakeinfo :", stakeinfo);
        })

        it("remainedLtos view test", async () => {
            remainedLtos = await StakingV2Logic.remainedLtos(Number(stakeIdcheck[1]))
            console.log("remainedLtos :", remainedLtos);
        })

        it("claimableLtos view test", async () => {
            claimableLtos = await StakingV2Logic.claimableLtos(Number(stakeIdcheck[1]))
            console.log("claimableLtos :", claimableLtos);
        })

        it("revertedWith Test", async () => {
            await expect(
                BondDepositoryLogic.connect(contractAdmin).create(
                    bondInfoEther.token,
                    [
                        bondInfoEther.market.capAmountOfTos,
                        bondInfoEther.market.closeTime,
                        bondInfoEther.market.priceTosPerToken,
                        bondInfoEther.market.purchasableTOSAmountAtOneTime
                    ]
                )
            ).to.be.revertedWith("Accessible: Caller is not an policy admin")
        })

        it('increase block time', async function () {
            const block = await ethers.provider.getBlock('latest')
            console.log(block.timestamp);
            let diffTime = Number(stakeinfo.endTime)-Number(block.timestamp);
            console.log(diffTime)

            ethers.provider.send("evm_increaseTime", [diffTime+10])
            ethers.provider.send("evm_mine")
        });

        it("claimableLtos view test", async () => {
            claimableLtos = await StakingV2Logic.claimableLtos(Number(stakeIdcheck[1]))
            console.log("claimableLtos :", claimableLtos);
        })

        it("increaseAmountForSimpleStake Test", async () => {
            await TOS.connect(user1).approve(StakingV2Logic.address,user1TOSstaking);
            await StakingV2Logic.connect(user1).increaseAmountForSimpleStake(
                Number(stakeIdcheck[1]),
                user1TOSstaking
            )
            remainedLtos = await StakingV2Logic.remainedLtos(Number(stakeIdcheck[1]))
            console.log("remainedLtos after add Stake:", remainedLtos);
            console.log("claimableLtos after add Stake:", (await StakingV2Logic.claimableLtos(Number(stakeIdcheck[1]))));
        })

        it("claimForSimpleType Test", async () => {
            remainedLtos = await StakingV2Logic.remainedLtos(Number(stakeIdcheck[1]))
            // console.log("remainedLtos before claimForSimpleType:", remainedLtos);

            await StakingV2Logic.connect(user1).claimForSimpleType(
                Number(stakeIdcheck[1]),
                claimableLtos
            )

            let afterRemainedLtos = await StakingV2Logic.remainedLtos(Number(stakeIdcheck[1]))
            expect(Number(remainedLtos)).to.be.gt(Number(afterRemainedLtos))

        })

        it("unstake Test", async () => {
            await StakingV2Logic.connect(user1).unstake(
                Number(stakeIdcheck[1])
            )

            remainedLtos = await StakingV2Logic.remainedLtos(Number(stakeIdcheck[1]))
            // console.log("remainedLtos after unstake:", remainedLtos);
            expect(Number(remainedLtos)).to.be.equal(0)
        })

        it("stakeGetStos Test", async () => {
            await TOS.connect(user1).approve(StakingV2Logic.address,user1TOSstaking);
            await StakingV2Logic.connect(user1).stakeGetStos(
                user1TOSstaking,
                1
            )
        })

        it("stakingOf view test", async () => {
            stakeIdcheck = await StakingV2Logic.stakingOf(user1.address);
            console.log("stakeId :", stakeIdcheck);
            console.log("stakeId :", Number(stakeIdcheck[0]));
            console.log("stakeId :", Number(stakeIdcheck[1]));
            console.log("stakeId :", Number(stakeIdcheck[2]));
        })

        it("increaseAmountForSimpleStake revertedWith", async () => {
            await TOS.connect(user1).approve(StakingV2Logic.address,user1TOSstaking);
            await expect(
                StakingV2Logic.connect(user1).increaseAmountForSimpleStake(
                    Number(stakeIdcheck[2]),
                    user1TOSstaking
                )
            ).to.be.revertedWith("it's not simple staking product")
        })



    })


})