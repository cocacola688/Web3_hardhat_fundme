const DECIMAL = 8
const INITIAL_ANSWER = 300000000000
const developmentChains = ["hardhat", "local"]    // hardhat是临时的，local是指真正的在持久化创建一个测试网络
const LOCK_TIME = 180
const CONFIRMATIONS = 5

const networkConfig = {
    11155111: {
        ethUsdDataFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306"
    },
    97: {
        ethUsdDataFeed: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7"
    }
    // 可以继续添加
}

module.exports = {
    DECIMAL,
    INITIAL_ANSWER,
    developmentChains,
    networkConfig,
    LOCK_TIME,
    CONFIRMATIONS
}