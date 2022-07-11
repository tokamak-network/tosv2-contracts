// const { expect } = require("chai");
// const { ethers } = require("hardhat");

const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;

const JSBI = require('jsbi');

//chai.use(require("chai-bn")(BN));
chai.use(solidity);
require("chai").should();
const univ3prices = require('@thanpolas/univ3prices');
const utils = require("./utils");

// const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");
const bn = require('bignumber.js');

const {
  deployedUniswapV3Contracts,
  FeeAmount,
  TICK_SPACINGS,
  getMinTick,
  getMaxTick,
  getNegativeOneTick,
  getPositiveOneMaxTick,
  encodePriceSqrt,
  getUniswapV3Pool,
  getBlock,
  mintPosition2,
  getTick,
  // getMaxLiquidityPerTick,
} = require("./uniswap-v3/uniswap-v3-contracts");

let NonfungiblePositionManager = require('../abis/NonfungiblePositionManager.json');
let UniswapV3Pool = require('../abis/UniswapV3Pool.json');
let UniswapV3LiquidityChanger = require('../abis/UniswapV3LiquidityChanger.json');
let tosabi = require('../abis/TOS.json');
let lockTOSProxyabi = require('../abis/LockTOSProxy_ABI.json');
let lockTOSProxy2abi = require('../abis/LockTOSProxy2_ABI.json');;
let lockTOSLogic2abi = require('../abis/LockTOSLogic2_ABI.json');const { id } = require("@ethersproject/hash");
;

let treasuryLogicAbi = require('../abis/Treasury.json');
let bondDepositoryLogicAbi = require('../abis/BondDepository.json');
let stakingV2LogicAbi = require('../abis/StakingV2.json');

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";


describe("price test", function () {
  //시나리오
  //팔려고하는 tos 목표치 = 10,000 -> 10ETH 받으면 판매 종료
  //받는 token(ETH)의 가격 = 1,000,000
  //TOS의 가격 = 1,000
  //1ETH = 1,000TOS
  //실제 ETH 가격 = 1,500,000, TOS의 가격 = 1,000 -> 1ETH = 1,500 TOS
  //500개의 tos만 더 생산되어도됨
  //mintRate = 10 -> ex) 1ETH가 들어오면 1000TOS * 10 -> 10,000TOS mint -> 1,000개는 유저에게, 9,000개는 treasury에 있음
  
  //mintingRate => 1ETH당 발행되는 TOS 물량이 mintingRate -> 10000 이여야함
  //dTOS 물량 users에 dTOS쓴 물량 넣기
  //한 tx당 살 수 있는 TOS물량이 정해져있음, 마켓만들때 세팅 가능하게 함 (공격을 막을려고 쓰는거임)
  
  //staking index가 증가되는 조건
  //staking index 증가시키는 시점
  //LTOS lockup 기간, TOS -> LTOS, TOS랑 이자는 Treasury에서 나오게함 돌려줌
  let provider;
  let nonfungiblePositionManager, uniswapV3Pool, uniswapV3LiquidityChanger ;

  let tosCalculator;
  let TOSValueCalculator;

  let treasurycont;
  let treasuryContract;
  let treasuryProxy;
  let treasuryProxylogic;

  let stakingcont;
  let stakingContract;
  let stakingProxy;
  let stakingProxylogic;
  
  let tosContract;
  let lockTosContract;
  let lockTos2Contract;
  let lockToslogic2Contract;

  let bondDepositorycont;
  let bondDepositoryContract;
  let bondDepositoryProxy;
  let bondDepositoryProxylogic;

  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 20;
  let epochUnit = 60;

  let depositTime;
  let depositTime2;
  let unstakingTime;

  let stakeIdcheck;
  let balanceOfLTOS;
  let stakingBalanceLTOS;
  let totalLTOS;

  let sellingTime = 120;

  let sellTosAmount = ethers.utils.parseUnits("10000", 18); //1ETH = 1000TOS 라서 10ETH받으면 끝임
  let overdepositAmount = ethers.utils.parseUnits("5", 18);     //over deposit상황
  let depositAmount = ethers.utils.parseUnits("2", 18);         //2ETH를 deposit하면 200LTOS를받음 (index가 10일때) -> 20000TOS가 생기고 2000TOS가 스테이킹됨 -> 18000TOS가 treasury에 있음// 2000TOS는 stakingContract에 있음
  let depositAmount2 = ethers.utils.parseUnits("3", 18);        //3ETH를 deposit하면 300LTOS를 받음 (index가 10일때) index가 19면? -> 157.89~를 받음
  let onePayout = ethers.utils.parseUnits("3000", 18);    //한번에 3000TOS 이상 살수 없음

  let beforetosAmount;
  let aftertosAmount;

  //let mintRate = 10;
  let mintRate = 10000;

  let unstakingAmount = ethers.utils.parseUnits("500", 18); 

  let ETHPrice = 1000000
  let TOSPrice = 1000

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";

  let testAddress = "0xcc0E10d30EeF023D98E6B73c019A9Ed617f1007C"
  let lockTOSProxyAddress = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568"
  let lockTOSProxy2Address = "0x5FA8C7673B6693cCE8991C10fCd2b9A1bA775b7B"
  let lockTOSLogic2Address = "0x50b8Ee0cCc76f66fFA669aA56218B3964dae4E78"
  let etherUint = ethers.utils.parseUnits("1", 18);     
  // let wtonUint = ethers.utils.parseUnits("1", 27);     

  let firstExcute = false;

  let firstMarketlength;

  // rinkeby
  let uniswapInfo={
      poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      wethUsdcPool: "0xfbDc20aEFB98a2dD3842023f21D17004eAefbe68",
      tosethPool: "0x7715dF692fb4031DC51C53b35eFC2b65d9e752c0",
      wtonWethPool: "0xE032a3aEc591fF1Ca88122928161eA1053a098AC",
      wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
      tosDOCPool: "0x831a1f01ce17b6123a7d1ea65c26783539747d6d",
      wton: "0x709bef48982Bbfd6F2D4Be24660832665F53406C",
      tos: "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd",
      weth: "0xc778417e063141139fce010982780140aa0cd5ab",
      usdc: "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b",
      doc: "",
      _fee: ethers.BigNumber.from("3000"),
      NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
  }
  
  before(async () => {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, minter1, minter2, proxyAdmin, proxyAdmin2 ] = accounts;
    console.log('admin1',admin1.address);    

    provider = ethers.provider;
    // poolInfo.admin = admin1;
    // tokenInfo.admin = admin1;

    // await hre.ethers.provider.send("hardhat_setBalance", [
    //   admin1.address,
    //   "0x56BC75E2D63100000",
    // ]);

    await hre.ethers.provider.send("hardhat_setBalance", [
      admin1.address,
      "0x8ac7230489e80000",
    ]);

  });

  describe("#0. lockTOSContract update", () => {
    if(firstExcute == false) {
      it("bring the LockTOSProxyContract", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSProxyabi, ethers.provider);
    
        let code = await ethers.provider.getCode(lockTosContract.address);
        expect(code).to.not.eq("0x");
      })
  
      it("bring the lockTOSProxy2Contract", async () => {
        lockTos2Contract = new ethers.Contract( lockTOSProxy2Address, lockTOSProxy2abi, ethers.provider);
  
        let code = await ethers.provider.getCode(lockTos2Contract.address);
        expect(code).to.not.eq("0x");
      })
  
      it("bring the lockTOSLogic2Contract", async () => {
        lockToslogic2Contract = new ethers.Contract( lockTOSLogic2Address, lockTOSLogic2abi, ethers.provider);
  
        let code = await ethers.provider.getCode(lockToslogic2Contract.address);
        expect(code).to.not.eq("0x");
      })
  
      it("lockTOSProxy upgrade", async () => {
        await lockTosContract.connect(admin1).upgradeTo(lockTos2Contract.address);
  
        let tx = lockTosContract.connect(admin1).upgradeTo(lockTos2Contract.address);
        await expect(tx).to.be.revertedWith('LockTOSProxy: same');
      })
  
      it("bring the newLockTOSProxyContract", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSProxy2abi, ethers.provider);
      })
  
      it("lockTOSProxy2 setimpletation", async () => {
        await lockTosContract.connect(admin1).setImplementation2(lockToslogic2Contract.address,0,true);
      })
  
      it("bring the newlogic", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSLogic2abi, ethers.provider);
      })
    } else {
      it("bring the newlogic", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSLogic2abi, ethers.provider);
      })
    }
  })

  describe("#0. Deploy the contract", () => {
    it("#0-0. Deploy TOSValueCalculator", async function () {
      tosCalculator = await ethers.getContractFactory("TOSValueCalculator");
      TOSValueCalculator = await tosCalculator.deploy();
      await TOSValueCalculator.deployed();
  
      let code = await ethers.provider.getCode(TOSValueCalculator.address);
      expect(code).to.not.eq("0x");
      // console.log(TOSValueCalculator.address);
    });

    it("#0-0-1. initialize TOSCalculator", async () => {
      await TOSValueCalculator.initialize(
        uniswapInfo.tos,
        uniswapInfo.weth,
        uniswapInfo.npm,
        uniswapInfo.tosethPool,
        uniswapInfo.poolfactory
      );
  
      let tosaddress = await TOSValueCalculator.tos()
      // console.log(tosaddress);
      expect(tosaddress).to.be.equal(uniswapInfo.tos);
    })

    it("#0-1. bring the TOS function", async () => {
      tosContract = new ethers.Contract( uniswapInfo.tos, tosabi, ethers.provider );
      // console.log(tosContract.address);
      let code = await ethers.provider.getCode(tosContract.address);
      expect(code).to.not.eq("0x");
    })

    describe("#0-2. Deploy Treasury", () => {
      it("#0-2-0. Deploy Treasury Logic", async () => {
        treasurycont = await ethers.getContractFactory("Treasury");
        treasuryContract = await treasurycont.connect(admin1).deploy();
        await treasuryContract.deployed();

        let code = await ethers.provider.getCode(treasuryContract.address);
        // console.log("treasuryContract.address : ", treasuryContract.address)
        expect(code).to.not.eq("0x");
      })

      it("#0-2-1. Deploy Treasury Proxy", async () => {
        treasurycont = await ethers.getContractFactory("TreasuryProxy");
        treasuryProxy = await treasurycont.connect(admin1).deploy();
        await treasuryProxy.deployed();
        
        await treasuryProxy.connect(admin1).upgradeTo(treasuryContract.address);
      })

      it("#0-2-2. initialize TreasuryProxy", async () => {
        await treasuryProxy.connect(admin1).initialize(
          tosContract.address,
          TOSValueCalculator.address
        );

        let calculAddrCheck = await treasuryProxy.calculator();
        expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      })

      it("#0-2-3. TreasuryProxyLogic set", async () => {
        treasuryProxylogic = new ethers.Contract( treasuryProxy.address, treasuryLogicAbi.abi, ethers.provider);
        // console.log(treasuryProxylogic);
      })
    })

    describe("#0-3. Deploy Staking", () => {
      it("#0-3-0. Deploy Staking Logic", async () => {
        stakingcont = await ethers.getContractFactory("StakingV2");
        stakingContract = await stakingcont.deploy();
        await stakingContract.deployed();


        let code = await ethers.provider.getCode(treasuryContract.address);
        // console.log("treasuryContract.address : ", treasuryContract.address)
        expect(code).to.not.eq("0x");
      })

      it("#0-3-1. Deploy Staking Proxy", async () => {
        stakingcont = await ethers.getContractFactory("StakingV2Proxy");
        stakingProxy = await stakingcont.connect(admin1).deploy();
        await stakingProxy.deployed();

        await stakingProxy.connect(admin1).upgradeTo(stakingContract.address);
      })

      it("#0-3-2. initialize StakingProxy", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;
        await stakingProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
          lockTosContract.address,
          treasuryProxy.address
        )

        let treasuryAddr = await stakingProxy.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#0-3-3. stakingProxyLogic set", async () => {
        stakingProxylogic = new ethers.Contract( stakingProxy.address, stakingV2LogicAbi.abi, ethers.provider);
      })
    })

    describe("#0-4. Deploy BondDepository", () => {
      it("#0-4-0. Deploy BondDepository logic", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepository");
        bondDepositoryContract = await bondDepositorycont.deploy();
        await bondDepositoryContract.deployed();

        let code = await ethers.provider.getCode(bondDepositoryContract.address);
        // console.log("bondDepositoryContract.address : ", bondDepositoryContract.address)
        expect(code).to.not.eq("0x");
      })

      it("#0-4-1. Deploy BondDepository Proxy", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepositoryProxy");
        bondDepositoryProxy = await bondDepositorycont.connect(admin1).deploy();
        await bondDepositoryProxy.deployed();

        await bondDepositoryProxy.connect(admin1).upgradeTo(bondDepositoryContract.address);
      })

      it("#0-4-2. initialize bondDepositoryProxy", async () => {
        await bondDepositoryProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          uniswapInfo.wton,
          stakingProxy.address,
          treasuryProxy.address,
          TOSValueCalculator.address
        )

        let calculAddrCheck = await bondDepositoryProxy.calculator();
        expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      })

      it("#0-4-3. stakingProxyLogic set", async () => {
        bondDepositoryProxylogic = new ethers.Contract( bondDepositoryProxy.address, bondDepositoryLogicAbi.abi, ethers.provider);
      })
    })
  
  })

  describe("#1. setting the contract", () => {
    it("give the mintRole to treasury", async () => {
      await tosContract.connect(admin1).grantRole(minter_role,treasuryProxy.address);
  
      let tx = await tosContract.hasRole(minter_role,treasuryProxy.address);
      expect(tx).to.be.equal(true);
    })

    describe("#1-1. treasury setting", () => {
      it("1-1. treasury admin, proxyAdmin, policyAdmin check", async () => {
        // console.log(treasuryProxy);
        expect(await treasuryProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)
  
        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(false)
      })
  
      it("#1-1-1. user can't call addPolicy", async () => {
        await expect(
          treasuryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-1-1. onlyProxyAdmin can call addPolicy", async () => {
        await treasuryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })
  
      it("#1-1-2. user can't call initialize", async () => {
        await expect(
          treasuryProxy.connect(user1).initialize(
            tosContract.address,
            TOSValueCalculator.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-1-2. onlyProxyAdmin can call initialize", async () => {
        await treasuryProxy.connect(admin1).initialize(
          tosContract.address,
          TOSValueCalculator.address  
        )
  
        let calculAddrCheck = await treasuryProxylogic.calculator();
        expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      })
  
      it("#1-1-3. user can't call enable (for mint)", async () => {
        await expect(
          treasuryProxylogic.connect(user1).enable(
            7,
            bondDepositoryProxy.address,
            admin1.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")      
      })
  
      it("#1-1-3. policy can call enable (for mint bondDepository)", async () => {
        expect(await treasuryProxylogic.isPolicy(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isProxyAdmin(admin1.address)).to.be.equal(true)

        await treasuryProxylogic.connect(admin1).enable(7,bondDepositoryProxy.address,user1.address);

        let checkPermission = await treasuryProxylogic.permissions(7,bondDepositoryProxy.address);

        expect(checkPermission).to.be.equal(true)
      })
  
      it("#1-1-3. policy can call enable (for mint staking)", async () => {
        let checkPermission1 = await treasuryProxylogic.permissions(7,stakingProxy.address);
        expect(checkPermission1).to.be.equal(false)
  
        await treasuryProxylogic.connect(admin1).enable(7,stakingProxy.address,admin1.address);
  
        let checkPermission2 = await treasuryProxylogic.permissions(7,stakingProxy.address);
        expect(checkPermission2).to.be.equal(true)
      })
  
      it("#1-1-4. user can't call approve (stakingV2)", async () => {
        await expect(
          treasuryProxylogic.connect(user1).approve(
            stakingProxy.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")      
      })
  
      it("#1-1-4. policy can call approve (stakingV2)", async () => {
        let beforeApprove = await tosContract.allowance(treasuryProxy.address, stakingProxy.address);
        expect(beforeApprove).to.be.equal(0)
        await treasuryProxylogic.connect(admin1).approve(stakingProxy.address)
  
        let afterApprove = await tosContract.allowance(treasuryProxy.address, stakingProxy.address);
        expect(afterApprove).to.be.above(0)
      })
  
      it("#1-1-5. user can't call disable", async () => {
        await expect(
          treasuryProxylogic.connect(user1).disable(
            7,
            stakingProxy.address        )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")  
      })
  
      it("#1-1-5. policy can call disable", async () => {
          let checkPermission1 = await treasuryProxylogic.permissions(7,stakingProxy.address);
          expect(checkPermission1).to.be.equal(true)
  
          await treasuryProxylogic.connect(admin1).disable(7,stakingProxy.address);
  
          let checkPermission2 = await treasuryProxylogic.permissions(7,stakingProxy.address);
          expect(checkPermission2).to.be.equal(false)
  
          await treasuryProxylogic.connect(admin1).enable(7,stakingProxy.address,admin1.address);
      })
    })

    describe("#1-2. Staking setting", async () => {
      it("#1-2. Staking admin, proxyAdmin, policyAdmin check", async () => {
        expect(await stakingProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await stakingProxy.isProxyAdmin(admin1.address)).to.be.equal(true)
  
        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-2-1. user can't call addPolicy", async () => {
        await expect(
          stakingProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-2-1. onlyProxyAdmin can call addPolicy", async () => {
        await stakingProxy.connect(admin1).addPolicy(admin1.address)
        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-2-2. user can't call initialize", async () => {
        await expect(
          stakingProxy.connect(user1).initialize(
            uniswapInfo.tos,
            [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
            lockTosContract.address,
            treasuryProxy.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-2-2. onlyProxyAdmin can call initialize", async () => {
        await stakingProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
          lockTosContract.address,
          treasuryProxy.address
        )

        let treasuryAddr = await stakingProxylogic.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#1-2-3. user can't call setRebasePerepoch", async () => {
        let rebasePerEpoch = ethers.utils.parseUnits("1", 17) //index가 0.1크기만큼 증가
        await expect(
          stakingProxylogic.connect(user1).setRebasePerepoch(rebasePerEpoch)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-2-3. onlyPolicyAdmin can call setRebasePerepoch", async () => {
        let rebasePerEpoch = ethers.utils.parseUnits("1", 17) //index가 0.1크기만큼 증가
        await stakingProxylogic.connect(admin1).setRebasePerepoch(rebasePerEpoch);
        expect((await stakingProxylogic.rebasePerEpoch())).to.be.equal(rebasePerEpoch)
      })

      it("#1-2-4. user can't call setindex", async () => {
        let index = ethers.utils.parseUnits("10", 18)
        await expect(
          stakingProxylogic.connect(user1).setindex(index)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-2-4. onlyPolicyAdmin can call setindex", async () => {
        let epochtestbefore = await stakingProxylogic.epoch();
  
        expect(epochtestbefore.length_).to.be.equal(20); 

        let index = ethers.utils.parseUnits("10", 18)
        await stakingProxylogic.connect(admin1).setindex(index);
        expect((await stakingProxylogic.index_())).to.be.equal(index)
      })

    })

    describe("#1-3. BondDepository setting", async () => {
      it("#1-3. BondDepository admin, proxyAdmin, policyAdmin check", async () => {
        expect(await bondDepositoryProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await bondDepositoryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)
  
        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-3-1. user can't call addPolicy", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-3-1. onlyProxyAdmin can call addPolicy", async () => {
        await bondDepositoryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-3-2. user can't call initialize", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).initialize(
            uniswapInfo.tos,
          uniswapInfo.wton,
          stakingProxy.address,
          treasuryProxy.address,
          TOSValueCalculator.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-3-2. onlyProxyAdmin can call initialize", async () => {
        await bondDepositoryProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          uniswapInfo.wton,
          stakingProxy.address,
          treasuryProxy.address,
          TOSValueCalculator.address
        )

        let treasuryAddr = await bondDepositoryProxylogic.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#1-3-3. user can't call setMR(mintRate)", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).setMR(mintRate)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin") 
      })

      it("#1-3-3. onlyPolicyAdmin can call setMR(mintRate)", async () => {
        await bondDepositoryProxylogic.connect(admin1).setMR(mintRate);

        let checkMR = await bondDepositoryProxylogic.mintRate();
        expect(checkMR).to.be.equal(mintRate);
      })

      it("#1-3-4. user can't call addTranser", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).addTransfer(user1.address,3)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin") 
      })

      it("#1-3-4. onlyPolicyAdmin can call addTranser", async () => {
        //3%
        let inputPercent = 3
        await bondDepositoryProxylogic.connect(admin1).addTransfer(user1.address,inputPercent);
        
        let checkPercent = await bondDepositoryProxylogic.totalPercents();
        expect(checkPercent).to.be.equal(inputPercent);
      })

      it("#1-3-5. user can't call transferChange", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).transferChange(0,user2.address,5)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin") 
      })

      it("#1-3-5. onlyPolicyAdmin can call transferChange", async () => {
        let inputPercent = 5
        await bondDepositoryProxylogic.connect(admin1).transferChange(0,user2.address,inputPercent);

        let checkPercent = await bondDepositoryProxylogic.totalPercents();
        expect(checkPercent).to.be.equal(inputPercent);
      })

      it("#1-3-6. user can't call create", async () => {
        const block = await ethers.provider.getBlock('latest')
        let finishTime = block.timestamp + sellingTime  //2분
        await expect(
          bondDepositoryProxylogic.connect(user1).create(
            true,
            admin1.address,
            uniswapInfo.tosethPool,
            [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-3-6. onlyPolicy can call create", async () => {
        const block = await ethers.provider.getBlock('latest')
        let finishTime = block.timestamp + sellingTime  //2분
        firstMarketlength = await bondDepositoryProxylogic.marketsLength();

        await bondDepositoryProxylogic.connect(admin1).create(
            true,
            admin1.address,
            uniswapInfo.tosethPool,
            [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
        )
      })

      it("#1-3-7. user can't call close", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).close(firstMarketlength)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-3-7. onlyPolicy can call close", async () => {
        await bondDepositoryProxylogic.connect(admin1).close(firstMarketlength);

        let marketcapacity = await bondDepositoryProxylogic.markets(firstMarketlength);
        expect(marketcapacity.capacity).to.be.equal(0);
      })


    })
    
  })

  describe("#2. lockTOS setting", async () => {
    it("#2-1-1. user can't set the stakingContarct", async () => {
      await expect(
        lockTosContract.connect(user1).setStaker(stakingProxylogic.address)
      ).to.be.revertedWith("Accessible: Caller is not an admin")      
    })

    it("#2-1-1. onlyLockTOSContract admin set the stakingContarct", async () => {
      await lockTosContract.connect(admin1).setStaker(stakingProxylogic.address);
  
      let staker = await lockTosContract.staker();
      expect(staker).to.be.equal(stakingProxylogic.address);
    })
  })

  describe("#3-1. bondDepository function test", async () => {
    it("#3-1-1. user don't create the ETH market", async () => {
      
    })

    it("#3-1-1. create the ETH market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + sellingTime  //2분
      let marketbefore = await bondDepositoryProxylogic.marketsLength();
      console.log(marketbefore)
      await bondDepositoryProxylogic.connect(admin1).create(
          true,
          admin1.address,
          uniswapInfo.tosethPool,
          [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
      )
      let marketafter = await bondDepositoryProxylogic.marketsLength();
      console.log(marketafter)
      expect(Number(marketbefore)+1).to.be.equal(marketafter);
    })

    it("#3-1-2. overDeposit situration", async () => {
      const block = await ethers.provider.getBlock('latest')
      depositTime = block.timestamp

      let beforetosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)
      expect(beforetosTreasuryAmount).to.be.equal(0)

      let marketlength = await bondDepositoryProxylogic.marketsLength();
      
      await expect(
        bondDepositoryProxylogic.connect(admin1).ETHDeposit(
          (marketlength-1),
          overdepositAmount,
          1,
          0,
          false,
          {value: overdepositAmount}
        )
      ).to.be.revertedWith("Depository : over maxPay");


      let aftertosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)

      expect(aftertosTreasuryAmount).to.be.equal(0)
    })

    it("#3-1-3. deposit ETHmarket", async () => {
      let beforeindex = await stakingProxylogic.index_()
      // console.log("beforeindex : ", beforeindex)

      const block = await ethers.provider.getBlock('latest')
      depositTime = block.timestamp

      let epoch = await stakingContract.epoch();
      console.log("1deposit epoch.end : ", epoch.end);
      console.log("1deposit blocktimeStamp : ", block.timestamp)

      let beforetosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)

      let marketlength = await bondDepositoryProxylogic.marketsLength();
      console.log("marketlength : ", marketlength);

      expect(beforetosTreasuryAmount).to.be.equal(0)
      
      let epochtime = await stakingProxylogic.epoch();

      await bondDepositoryProxylogic.connect(admin1).ETHDeposit(
        (marketlength-1),
        depositAmount,
        1,
        0,
        false,
        {value: depositAmount}
      );

      let afterindex = await stakingProxylogic.index_()
      console.log("depositTime :", depositTime)
      console.log("epoch.end :", epochtime.end)
      if(epochtime.end < depositTime) {
        expect(afterindex).to.be.above(beforeindex)
      } else {
        expect(afterindex).to.be.equal(beforeindex)
      }
      // console.log("afterindex : ", afterindex)

      //18000TOS가 treasury에 있음
      let aftertosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)
      console.log("aftertosTreasuryAmount : ", aftertosTreasuryAmount)

      expect(aftertosTreasuryAmount).to.above(0)
    })

    it("#3-1-4. stakinOf view test", async () => {
      stakeIdcheck = await stakingProxylogic.connect(admin1).stakinOf(admin1.address);
      console.log("stakeId :", Number(stakeIdcheck)); 
    })

    it("#3-1-5. balanceOfId and balanceOf view test", async () => {
      balanceOfLTOS = await stakingProxylogic.connect(admin1).balanceOfId(Number(stakeIdcheck));
      console.log("id LTOS balance : ", balanceOfLTOS);

      totalLTOS = await stakingProxylogic.connect(admin1).balanceOf(admin1.address);
      console.log("totaluserLTOS : ", totalLTOS);

      expect(balanceOfLTOS).to.be.equal(totalLTOS);
    })
    
    it("#3-1-6. stakingBalances storage and balanceOf view test", async () => {
      stakingBalanceLTOS = await stakingProxylogic.connect(admin1).stakingBalances(admin1.address,Number(stakeIdcheck));
      console.log("LTOS : ", stakingBalanceLTOS.LTOS);

      totalLTOS = await stakingProxylogic.connect(admin1).balanceOf(admin1.address);
      console.log("totaluserLTOS : ", totalLTOS);

      expect(totalLTOS).to.be.equal(stakingBalanceLTOS.LTOS);
    })


    it("#3-1-7. unstaking can't before endTime", async () => {
      await expect(
        stakingProxylogic.connect(admin1).unstake(
              admin1.address,
              Number(stakeIdcheck),
              stakingBalanceLTOS.LTOS,
          )
      ).to.be.revertedWith("need the endPeriod");
    })

    it("#3-1-6. unstaking can after endTime", async () => {
      let stakingInfo =  await stakingProxylogic.connect(admin1).stakingBalances(admin1.address,Number(stakeId[0]));

      const block = await ethers.provider.getBlock('latest')

      console.log("1")
      if(Number(depositTime2) > Number(stakingInfo.endTime)) {
        unstakingTime = depositTime2 + 15;
      } else if(block.timestamp > depositTime2 && block.timestamp > stakingInfo.endTime) {
        unstakingTime = block.timestamp;
      } else {
        unstakingTime = Number(stakingInfo.endTime) + 15;
      }
      console.log("2")
      console.log("blockTime : ", block.timestamp);
      console.log("unstakingTime : ", unstakingTime);
      await ethers.provider.send('evm_setNextBlockTimestamp', [unstakingTime]);
      await ethers.provider.send('evm_mine');

      beforetosAmount = await tosContract.connect(admin1).balanceOf(admin1.address);
      console.log("beforetosAmount :", beforetosAmount)

      let index = await stakingProxylogic.index_()
      console.log("index :" , index)

      //500LTOS unstaking함 -> 5500TOS 받아야함
      await stakingProxylogic.connect(admin1).unstake(
        admin1.address,
        Number(stakeIdcheck),
        stakingBalanceLTOS.LTOS
      )    
      
      let getTOSAmount = (unstakingAmount * index) / etherUint;

      aftertosAmount = await tosContract.connect(admin1).balanceOf(admin1.address);
      console.log("aftertosAmount : ", aftertosAmount)
      let tosdiffAmount = aftertosAmount - beforetosAmount;
      console.log("tosdiffAmount", tosdiffAmount)
      console.log("getTOSAmount :", getTOSAmount)
    })

    // it("deposit2 ETHmarket", async() => {
    //   depositTime2 = depositTime + 25;
    //   await ethers.provider.send('evm_setNextBlockTimestamp', [depositTime2]);
    //   await ethers.provider.send('evm_mine');
      
    //   let beforeindex = await stakingContract.index_()
    //   console.log(beforeindex)
        
    //   const block = await ethers.provider.getBlock('latest')
    //   let epoch = await stakingContract.epoch();
    //   console.log("epoch.end : ", epoch.end);
    //   console.log("blocktimeStamp : ", block.timestamp)

    //   let nextindex = await stakingContract.nextIndex()
    //   console.log("nextindex : ", nextindex);

    //   let enableStaking = await treasuryContract.enableStaking();
    //   let nextLTOSinterrest = await stakingContract.nextLTOSinterest()

    //   console.log("enableStaking : ", enableStaking);
    //   console.log("nextLTOSinterrest : ", nextLTOSinterrest)

    //   await bondDepositoryContract.connect(admin1).ETHDeposit(
    //       0,
    //       depositAmount2,
    //       1,
    //       0,
    //       false,
    //       {value: depositAmount2}
    //   );

    //   let afterindex = await stakingContract.index_()
    //   console.log(afterindex)

    //   expect(afterindex).to.not.equal(beforeindex)
    //   expect(afterindex).to.above(beforeindex)
    // })

  })


});
