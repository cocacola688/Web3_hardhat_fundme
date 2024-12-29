const { ethers, deployments, getNamedAccounts, network } = require("hardhat")
const { assertHardhatInvariant } = require("hardhat/internal/core/errors")
const { assert, expect } = require("chai")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")


developmentChains.includes(network.name)
? describe.skip
: describe("test fundme contract", async function () {
    let fundMe
    let firstAccount
    beforeEach(async function () {
        await deployments.fixture(["all"])  // 部署所有tag为all的合约
        firstAccount = (await getNamedAccounts()).firstAccount  // 默认使用第一个账户
        const fundMeDeployment = await deployments.get("FundMe")
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address)
    })

    // test fund and getFund successfully
    it("fund and getFund successfully",
        async function() {
            // make sure target reached
            await fundMe.fund({value: ethers.parseEther("0.002")}) // 3000 * 0.002 = 6

            // make sure window closed
            await new Promise(resolve => setTimeout(resove, 181 * 1000))    // js中的单位是毫秒，所以要乘1000

            // make sure we can get receipt
            // getFund()只是发送交易，并不能保证交易如块，由于本地延迟很低，因此可以不用等待入块，但是测试网不行
            const getFundTx = await fundMe.getFund()
            const getFundReceipt = await getFundTx.wait()   // 等待交易入块
            await expect(getFundReceipt).
                to.emit(fundMe, "FundWithdrawByOwner")
                .withArgs(ethers.parseEther("0.5"))
        }
    )
    // test fund and refund successfully
    it("fund and refund successfully",
        async function() {
            // make sure target not reached
            await fundMe.fund({value: ethers.parseEther("0.00004")})    // 3000 * 0.00004 = 1.2

            // make sure window closed
            await new Promise(resolve => setTimeout(resove, 181 * 1000))    // js中的单位是毫秒，所以要乘1000

            // make sure we can get receipt
            // getFund()只是发送交易，并不能保证交易如块，由于本地延迟很低，因此可以不用等待入块，但是测试网不行
            const refundTx = await fundMe.refund()
            const refundReceipt = await refundTx.wait()   // 等待交易入块
            await expect(refundReceipt).
                to.emit(fundMe, "RefundByFunder")
                .withArgs(firstAccount, ethers.parseEther("0.00004"))
        }
    )
})