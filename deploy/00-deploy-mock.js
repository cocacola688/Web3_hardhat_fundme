const { DECIMAL, INITIAL_ANSWER, developmentChains } = require("../helper-hardhat-config")
module.exports = async({getNamedAccounts, deployments}) => {
    
    if(developmentChains.includes(network.name)/*local or hardhat*/) {
        const firstAccount = (await getNamedAccounts()).firstAccount
        const { deploy } = deployments

        await deploy("MockV3Aggregator", {
            from: firstAccount,
            /*
            _decimals指合约体系的精度(比如之前priceFeed合约的是8，因为USD的精度就是8位，如果是ETH，这里就填18)
            _initialAnswer指假的价格数据(比如要假设1ETH=3000美元，这里就需要填3000 00000000)
            constructor(uint8 _decimals, int256 _initialAnswer) {
                decimals = _decimals;
                updateAnswer(_initialAnswer);
            }
            */
            args: [DECIMAL, INITIAL_ANSWER],
            log: true
        })
    } else {
        console.log("environment is not local, mock contract depployment is skipped")
    }
}

module.exports.tags = ["all", "mock"]

