const { task } = require("hardhat/config")
task("deploy-fundme", "deploy and verify fundme contract").setAction(async(taskArgs, hre) => {
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
})

async function verifyFundMe(fundMeAddr, args) {
    await hre.run("verify:verify", {
        address: fundMeAddr,
        constructorArguments: args,
    });
}