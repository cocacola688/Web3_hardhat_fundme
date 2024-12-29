// function deployFunction() {
//     console.log("this is a deploy function")
// }

const { network } = require("hardhat")
const { developmentChains, networkConfig, LOCK_TIME, CONFIRMATIONS } = require("../helper-hardhat-config")

// module.exports.default = deployFunction

// 上面代码的简写形式
// module.exports = async(hre) => {
//     const getNamedAccounts = hre.getNamedAccounts
//     const deployments = hre.deployments

//     console.log("this is a deploy function")
// }

// 上面代码的简写形式
module.exports = async({getNamedAccounts, deployments}) => {
    const firstAccount = (await getNamedAccounts()).firstAccount
    const { deploy } = deployments

    let dataFeedAddr
    let confirmations
    // defaultNetwork: hardhat
    if(developmentChains.includes(network.name)/*local or hardhat*/) {
        const mockV3Aggregator = await deployments.get("MockV3Aggregator")
        dataFeedAddr = mockV3Aggregator.address
        confirmations = 0
    } else {
        dataFeedAddr = networkConfig[network.config.chainId].ethUsdDataFeed
        confirmations = CONFIRMATIONS
    }
    
    const fundMe = await deploy("FundMe", {
        from: firstAccount,
        args: [LOCK_TIME, dataFeedAddr],
        log: true,
        waitConfirmations: confirmations    // 配置该选项后部署后会等待5个确认
    })

    // 只有当合约部署在sepolia测试网上时才进行验证
    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY) {
        await hre.run("verify:verify", {
            address: fundMe.address,
            constructorArguments: [LOCK_TIME, dataFeedAddr],
        })
    } else {
        console.log("Network is not sepolia, verification is skipped...")
    }
}

module.exports.tags = ["all", "fundme"]