const { ethers, deployments, getNamedAccounts, network } = require("hardhat")
const { assertHardhatInvariant } = require("hardhat/internal/core/errors")
const { assert, expect } = require("chai")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
? describe.skip
: describe("test fundme contract", async function () {
    let fundMe
    let fundMeSecondAccount
    let firstAccount
    let secondAccount
    let mockV3Aggregator
    beforeEach(async function () {
        await deployments.fixture(["all"])  // 部署所有tag为all的合约
        firstAccount = (await getNamedAccounts()).firstAccount  // 默认使用第一个账户
        secondAccount = (await getNamedAccounts()).secondAccount
        // deployments可以用于跟踪所有已部署的合约
        const fundMeDeployment = await deployments.get("FundMe")
        mockV3Aggregator = await deployments.get("MockV3Aggregator")
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address)
        fundMeSecondAccount = await ethers.getContract("FundMe", secondAccount) // ethers本身不提供getContract，需要下载一些包
    })

    it("test if the owner is msg.sender", async function () {
        await fundMe.waitForDeployment()

        assert.equal((await fundMe.owner()), firstAccount)
    })

    it("test if the datafeed is assigned correctly", async function () {
        await fundMe.waitForDeployment()
        // assert.equal((await fundMe.dataFeed()), "0x694AA1769357215DE4FAC081bf1f309aDC325306")
        
        assert.equal((await fundMe.dataFeed()), mockV3Aggregator.address)
    })

    // fund, getFund, refund三个函数均涉及资产
    // unit test for fund
    // window open, value greater thean minimum value, funder balance
    it("window closed, value greater than minimum, fund failed",
        async function() {
            // 利用helpers模式在测试网上时间的流逝
            // make sure the window is closed
            await helpers.time.increase(200)    // LOCK_TIME=180
            await helpers.mine()                // 模拟挖矿
            // value is greater than minimum value
            // console.log(ethers.parseEther("0.001"))
            // let a = await fundMe.convertEthToUSD(ethers.parseEther("0.001"))
            // console.log(a)
            expect(fundMe.fund({value: ethers.parseEther("0.001")}))    // 以wei为单位(以太坊最小单位)
                .to.be.revertedWith("window is closed")
        }
    )

    it("window open, value is less than minimum, fund failed",
        async function() {
            // console.log(ethers.parseEther("0.000001"))
            // let a = await fundMe.convertEthToUSD(ethers.parseEther("0.000001"))
            // console.log(a)
            // console.log(fundMe.MINIMUM_VALUE())
            // value is less than minimum value
            expect(fundMe.fund({value: ethers.parseEther("0.000001")}))    // 以wei为单位(以太坊最小单位)
                .to.be.revertedWith("Send more ETH")                    // 错误信息要和FundMe合约中的require()函数提示的相对应
        }
    )

    it("window open, value is greater than minimum, fund success",
        async function() {
            // console.log(firstAccount)
            // value is greater than minimum value
            await fundMe.fund({value: ethers.parseEther("0.001")})    // 以wei为单位(以太坊最小单位)
            const balance = await fundMe.fundersToAmount(firstAccount)
            expect(balance).to.equal(ethers.parseEther("0.001"))
        }
    )

    // unit test for getFund
    // onlyOwner, windowClose, target reached
    it("not owner, window closed, target reached, getFund failed",
        async function() {
            // make sure the target is reached
            await fundMe.fund({value: ethers.parseEther("1")})

            // make sure the window is closed
            await helpers.time.increase(200)    // LOCK_TIME=180
            await helpers.mine()                // 模拟挖矿
            
            // 由其它用户调用getFund()函数
            await expect(fundMeSecondAccount.getFund()).to.be.revertedWith("this function can only be called by owner")
        }
    )

    it("is owner, window open, target reached, getFund failed",
        async function() {
            // make sure the target is reached
            await fundMe.fund({value: ethers.parseEther("1")})

            await expect(fundMe.getFund()).to.be.revertedWith("window is not closed")
        }
    )

    it("is owner, window closed, target not reached, getFund failed",
        async function() {
            // the target is not reached
            await fundMe.fund({value: ethers.parseEther("0.0004")}) // 大概美元数是0.0004 * 3000 = 1.2，1 < 1.2 < 5

            // make sure the window is closed
            await helpers.time.increase(200)    // LOCK_TIME=180
            await helpers.mine()                // 模拟挖矿

            await expect(fundMe.getFund()).to.be.revertedWith("Target is not reached")
        }
    )

    it("is owner, window closed, target is reached, getFund success",
        async function() {
            // 正常判断方法是：先取owner的balance，再取合约的balance，然后相加的和与owner最终的balance对比
            // 但是这种方法实现很复杂，因此通过event实现(event相当于日志)
            
            // the target is reached
            await fundMe.fund({value: ethers.parseEther("0.1")})
            // make sure the window is closed
            await helpers.time.increase(200)    // LOCK_TIME=180
            await helpers.mine()                // 模拟挖矿

            await expect(fundMe.getFund())
                .to.emit(fundMe, "FundWithdrawByOwner")
                .withArgs(ethers.parseEther("0.1"))
        }
    )

    // refund
    // window closed, target not reached, funder has balance
    it("window open, target not reached, funder has balance",
        async function() {
            // the target is not reached
            await fundMe.fund({value: ethers.parseEther("0.0004")}) // 大概美元数是0.0004 * 3000 = 1.2，1 < 1.2 < 5
            await expect(fundMe.refund()).to.be.revertedWith("window is not closed")
        }
    )

    it("window closed, target is reached, funder has balance",
        async function() {
            // the target is reached
            await fundMe.fund({value: ethers.parseEther("0.1")})
            // make sure the window is closed
            await helpers.time.increase(200)    // LOCK_TIME=180
            await helpers.mine()                // 模拟挖矿

            await expect(fundMe.refund()).to.be.revertedWith("Target is reached")
        }
    )

    it("window closed, target not reached, funder has no balance",
        async function() {
            // the target is not reached
            await fundMe.fund({value: ethers.parseEther("0.0004")})
            // make sure the window is closed
            await helpers.time.increase(200)    // LOCK_TIME=180
            await helpers.mine()                // 模拟挖矿

            await expect(fundMeSecondAccount.refund()).to.be.revertedWith("there is no fund for you")
        }
    )

    it("window closed, target not reached, funder has balance",
        async function() {
            // the target is not reached
            await fundMe.fund({value: ethers.parseEther("0.0004")})
            // make sure the window is closed
            await helpers.time.increase(200)    // LOCK_TIME=180
            await helpers.mine()                // 模拟挖矿

            await expect(fundMe.refund()).to.emit(fundMe, "RefundByFunder").withArgs(firstAccount, ethers.parseEther("0.0004"))
        }
    )
})