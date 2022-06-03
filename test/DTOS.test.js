const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

describe("DTOS", function () {

    let dtosImpl, dtosProxy, testLogicAddress ;

    let dTOS = {
        admin:null,
        contract: null,
        implAddress: null,
        name: 'DTOS',
        symbol: 'DTOS',
        decimals: 27,
        factor: ethers.BigNumber.from('1'),
        totalSupply: ethers.BigNumber.from('0')
    }

    before(async function () {
        accounts = await ethers.getSigners();
        [admin, user1, user2 ] = accounts
        provider = ethers.provider;

    });

    it("Create DTOS", async function () {

        const DTOS = await ethers.getContractFactory("DTOS");
        dtosImpl = await DTOS.connect(admin).deploy();
        await dtosImpl.deployed();


        const DTOSProxy = await ethers.getContractFactory("DTOSProxy")
        dtosProxy = await DTOSProxy.connect(admin).deploy();
        await dtosProxy.deployed();

        dTOS.admin = admin;
        dTOS.implAddress = dtosImpl.address;
        dTOS.contract = dtosProxy;

        await(await dtosProxy.connect(admin).upgradeTo(dtosImpl.address)).wait();
        let code = await dTOS.admin.provider.getCode(dTOS.contract.address);
        expect(code).to.not.eq("0x");

        /*
        await(await dtosProxy.connect(admin).initialize(dTOS.name, dTOS.symbol, dTOS.factor)).wait();

        expect(await dTOS.contract.name()).to.be.equal(dTOS.name);
        expect(await dTOS.contract.symbol()).to.be.equal(dTOS.symbol);
        expect(await dTOS.contract.decimals()).to.be.equal(dTOS.decimals);
        */

    });

    describe("1. Proxy Test   ", function () {
        it("1-1. addAdmin : when not admin, fail", async function () {
            expect(await dtosProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(dtosProxy.connect(user2).addAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });
        it("1-1. addAdmin only admin ", async function () {
            expect(await dtosProxy.isAdmin(dTOS.admin.address)).to.be.eq(true);
            await dtosProxy.connect(dTOS.admin).addAdmin(user2.address);
        });
        it("1-2. removeAdmin : when not self-admin, fail", async function () {
            await expect(dtosProxy.connect(dTOS.admin).removeAdmin(user2.address)).to.be.revertedWith("AccessControl: can only renounce roles for self");
        });
        it("1-2. removeAdmin ", async function () {
            await dtosProxy.connect(user2).removeAdmin(user2.address);
        });
        it("1-3. transferAdmin : when not admin, fail ", async function () {
            await expect(dtosProxy.connect(user2).transferAdmin(user1.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-3. transferAdmin ", async function () {
            await dtosProxy.connect(dTOS.admin).addAdmin(user2.address);

            expect(await dtosProxy.isAdmin(user2.address)).to.be.eq(true);

            await dtosProxy.connect(user2).transferAdmin(user1.address);
        });

        it("1-4. setImplementation2 : when not admin, fail", async function () {
            await expect(dtosProxy.connect(user2).setImplementation2(dtosImpl.address,0, true))
            .to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-4/5. setImplementation2", async function () {

            let tx = await dtosProxy.connect(dTOS.admin).setImplementation2(
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

            expect(await dtosProxy.isAdmin(user1.address)).to.be.eq(true);
            expect(await dtosProxy.isAdmin(user2.address)).to.be.eq(false);


            await expect(
                dtosProxy.connect(user2).setSelectorImplementations2(
                    [_func1, _func2],
                    testLogicAddress )
            ).to.be.revertedWith("Accessible: Caller is not an admin");

            await expect(
                dtosProxy.connect(user2).setAliveImplementation2(
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

            let tx = await dtosProxy.connect(dTOS.admin).setImplementation2(
                testLogicAddress, 1, true
            );

            await tx.wait();

            tx = await dtosProxy.connect(dTOS.admin).setSelectorImplementations2(
                [_func1, _func2],
                testLogicAddress
            );

            await tx.wait();

            expect(await dtosProxy.implementation2(1)).to.be.eq(testLogicAddress);
            expect(await dtosProxy.getSelectorImplementation2(_func1)).to.be.eq(testLogicAddress);
            expect(await dtosProxy.getSelectorImplementation2(_func2)).to.be.eq(testLogicAddress);

            const TestLogicContract = await ethers.getContractAt("TestLogic", dtosProxy.address);

            let a = ethers.BigNumber.from("1");
            let b = ethers.BigNumber.from("2");

            let add = await TestLogicContract.sayAdd(a, b);
            expect(add).to.be.eq(a.add(b));

            let mul = await TestLogicContract.sayMul(a, b);
            expect(mul).to.be.eq(a.mul(b));

            tx = await dtosProxy.connect(dTOS.admin).setAliveImplementation2(
                testLogicAddress, false
            );

            await tx.wait();

            await expect(
                TestLogicContract.sayAdd(a, b)
            ).to.be.reverted ;

            await expect(
                TestLogicContract.sayMul(a, b)
            ).to.be.reverted ;
            /*
            await expect(
                TestLogicContract.sayAdd(a, b)
            ).to.be.revertedWith("function selector was not recognized and there's no fallback function");

            await expect(
                TestLogicContract.sayMul(a, b)
            ).to.be.revertedWith("function selector was not recognized and there's no fallback function");
                */
        });


        it("1-10. initialize : when not admin, fail", async function () {

            await expect(
                dtosProxy.connect(user2).initialize(
                    dTOS.name,
                    dTOS.symbol,
                    dTOS.factor
                )
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-10. initialize", async function () {
            expect(await dtosProxy.isAdmin(user1.address)).to.be.eq(true);

            let tx = await dtosProxy.connect(user1).initialize(
                        dTOS.name,
                        dTOS.symbol,
                        dTOS.factor
                    );

            await tx.wait();

            expect(await dtosProxy.name()).to.be.equal(dTOS.name);
            expect(await dtosProxy.symbol()).to.be.equal(dTOS.symbol);
            expect(await dtosProxy.decimals()).to.be.equal(dTOS.decimals);

        });

        it("1-11. initialize : only once exceute", async function () {

            await expect(
                dtosProxy.connect(dTOS.admin).initialize(
                    dTOS.name,
                    dTOS.symbol,
                    dTOS.factor
                )
            ).to.be.revertedWith("already set");
        });


        it("1-12. setProxyPause : when not admin, fail", async function () {

            expect(await dtosProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(
                dtosProxy.connect(user2).setProxyPause(true)
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("1-12. setProxyPause : only admin", async function () {

            expect(await dtosProxy.isAdmin(user1.address)).to.be.eq(true);
            await dtosProxy.connect(user1).setProxyPause(true);

            expect(await dtosProxy.pauseProxy()).to.be.eq(true);

            const DTOSContract = await ethers.getContractAt("DTOS", dtosProxy.address);

            await expect(
                DTOSContract.totalSupply()
            ).to.be.revertedWith("Proxy: impl OR proxy is false");

            await dtosProxy.connect(user1).setProxyPause(false);
            expect(await dtosProxy.pauseProxy()).to.be.eq(false);

            expect(await DTOSContract["totalSupply()"]()).to.be.eq(ethers.BigNumber.from("0"));
        });
    });

    describe("2. Only Admin Functions ", function () {
        it("2-1. addAdmin : when not admin, fail", async function () {
            expect(await dtosProxy.isAdmin(user2.address)).to.be.eq(false);
            await expect(dtosProxy.connect(user2).addAdmin(user2.address)).to.be.revertedWith("Accessible: Caller is not an admin");
        });
    });

});
