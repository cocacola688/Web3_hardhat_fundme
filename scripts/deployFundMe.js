// import ethers.js
// create main function
    // init 2 accounts
    // fund contract with first account
    // check balance of contract
    // func contract with second account
    // check balance of contract
    // check mapping fundersToAmount
// execute main function

// 从hardhat包中引入ethers
const { ethers } = require("hardhat")

async function main() {
    // create factory
    const fundMeFactory = await ethers.getContractFactory("FundMe") // 加上await表示等当前语句执行完再往下执行 // async函数中才可以使用await
    console.log("contract deploy")
    // deploy contract from factory
    const fundMe = await fundMeFactory.deploy(300) // 仅仅是发起部署请求，但是并不保证合约被打包入块 // 这里的参数10是针对FundMe构造函数的
    await fundMe.waitForDeployment()  // 指等待合约上链
    console.log(`contract has been deployed successfully, contract address is + ${fundMe.target}`)    // 部署成功，打印合约地址

    // hre hardhat run envirement
    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY) { // apiKey不为空并且chain是sepolia
        console.log("Waitting for 5 confirmations")
        await fundMe.deploymentTransaction().wait(5)  // 等待部署交易后的5个区块
        await verifyFundMe(fundMe.target, [300])
    } else {
        console.log("verification skipped...")
    }

    // init 2 accounts
    const [firstAccount, secondAccount] = await ethers.getSigners()
    // fund contract with first account
    const fundTx = await fundMe.fund({value: ethers.parseEther("0.005")})  // 以太坊不支持小数，所以通过hardhat提供的函数进行转换 
    // 和部署合约时使用的deploy()函数有同样的问题，即智能保证fund()操作发送成功，但是并不能保证上链了
    await fundTx.wait()
    // check balance of contract
    const balanceOfContract = await ethers.provider.getBalance(fundMe.target)   // 将这个provider看作metamask或者etherscan，它可以代替我们去获取合约的信息
    console.log(`Balance of the contract is ${balanceOfContract}`)
    // func contract with second account
    const fundTxWithSecondAccount = await fundMe.connect(secondAccount).fund({value: ethers.parseEther("0.005")})  // 默认连接配置文件中的第一个地址，如果要连接其他的，需要手动指定
    await fundTxWithSecondAccount.wait()
    // check balance of contract
    const balanceOfContractAfterSecondFund = await ethers.provider.getBalance(fundMe.target)   // 将这个provider看作metamask或者etherscan，它可以代替我们去获取合约的信息
    console.log(`Balance of the contract is ${balanceOfContractAfterSecondFund}`)
    // check mapping fundersToAmount
    const firstAccountBalanceInFundMe = await fundMe.fundersToAmount(firstAccount.address)
    const secondAccountBalanceInFundMe = await fundMe.fundersToAmount(firstAccount.address)
    console.log(`Balance of first account ${firstAccount.address} is ${firstAccountBalanceInFundMe}`)
    console.log(`Balance of second account ${secondAccount.address} is ${secondAccountBalanceInFundMe}`)
}

main().then().catch((error) => {
    console.error(error)
    process.exit(1)
})  // 捕捉main函数执行时产生的错误

async function verifyFundMe(fundMeAddr, args) {
    await hre.run("verify:verify", {
        address: fundMeAddr,
        constructorArguments: args,
    });
}