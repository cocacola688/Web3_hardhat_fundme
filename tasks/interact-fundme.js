const { task } = require("hardhat/config")

task("interact-contract", "interact with fundme contract")
.addParam("addr", "fundme contract address")
.setAction(async(taskArgs, hre) => {
    // 我们并没有FundMe对象，因此这里需要先传入合约的地址，然后再实例化FundMe对象
    const fundMeFactory = await ethers.getContractFactory("FundMe")
    const fundMe = fundMeFactory.attach(taskArgs.addr)
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
})