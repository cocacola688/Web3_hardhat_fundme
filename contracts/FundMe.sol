// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// 1. 创建一个收款函数
// 2. 记录投资人并且查看
// 3. 在锁定期内，达到收款目标值时，生产商可以提款
// 4. 在锁定期内，没有达到目标值时，投资人可以退款

contract FundMe {
    mapping (address => uint256) public fundersToAmount;
    // uint256 MINIMUM_VALUE = 1 * 10 ** 18;   // 1 ETH = 10 ** 18 wei
    // 若用户以USD为单位进行投资呢？利用预言机获取当前ETH通证的市值
    // 单个服务器作为预言机会有单点故障问题（坏了或被攻击）--> 去中心化的预言机网络
    AggregatorV3Interface public dataFeed;
    uint256 constant MINIMUM_VALUE = 1 * 10 ** 18;    // 表示最少为1美元

    uint256 constant TARGET = 5 * 10 ** 18;  // 表示最少为5美元

    address public owner;

    uint256 deployTimestamp;    // 区块链时间戳的单位是秒
    uint256 lockTime;

    address erc20Addr;

    bool public getFundSuccess = false; // 标注合约是否已完成工作

    event FundWithdrawByOwner(uint256);
    event RefundByFunder(address, uint256);

    constructor(uint256 _lockTime, address dataFeedAddr) {
        // 使用的是sepolia testnet中 ETH/USD 的price feed合约地址，若使用别的则需要找相应的合约地址
        dataFeed = AggregatorV3Interface(dataFeedAddr);
        owner = msg.sender;
        deployTimestamp = block.timestamp;
        lockTime = _lockTime;
    }

    function fund() external payable {
        require(block.timestamp < deployTimestamp + lockTime, "window is closed");
        require(convertEthToUSD(msg.value) >= MINIMUM_VALUE, "Send more ETH"); // 若condition不成立会revert
        fundersToAmount[msg.sender] = msg.value;
    }

    function getChainlinkDataFeedLatestAnswer() public view returns (int) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    function convertEthToUSD(uint256 ethAmount) internal view returns(uint256) {
        // (ETH amount) * (ETH price) = (ETH value)
        uint256 ethPrice = uint256(getChainlinkDataFeedLatestAnswer());
        return ethAmount * ethPrice / (10 ** 8);    // 注意这里的ethAmount以wei为单位
        // ETH / USD precision = 10 ** 8
        // X / ETH precision = 10 ** 18

        // 1 ETH = 10 ** 18 wei
        // 1 USD = 10 ** 8 最小单位
        // ethPrice指 1 ETH 等值多少 美元最小单位
        // 1ETH等于 ethPrice / (10 ** 8) 美元
        // 故ethAmount 等值 ethAmount / (10 ** 18) * ethPrice / (10 ** 8) 美元
        // 因此若要求输入金额>=100美元则有：ethAmount / (10 ** 18) * ethPrice / (10 ** 8) >= 100，即ethAmount * ethPrice / (10 ** 8) >= 100 * 10 ** 18
    }

    function getFund() external windowNotClosed onlyOwner{
        require(convertEthToUSD(address(this).balance/*wei*/) >= TARGET, "Target is not reached");
        
        // 纯转账使用transfer和send
        // transfer：transfer ETH and revert if tx failed
        // payable (msg.sender).transfer(address(this).balance);
        // send：transfer ETH and return false if failed
        // bool success = payable (msg.sender).send(address(this).balance);
        // require(success, "tx failed");
        // 纯转账+其它任务使用call(官方推荐都使用这个)
        // call：transfer ETH with data, return value of function and bool
        bool success;
        uint256 balance = address(this).balance;
        (success, ) = payable (msg.sender).call{value: balance}("");
        require(success, "transfer tx failed");
        fundersToAmount[msg.sender] = 0;    // 这是个细节，但是感觉无用
        getFundSuccess = true;

        // emit event
        emit FundWithdrawByOwner(balance);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    function refund() external windowNotClosed{
        require(convertEthToUSD(address(this).balance) < TARGET, "Target is reached");
        require(fundersToAmount[msg.sender] != 0, "there is no fund for you");
        bool success;
        uint256 balance = fundersToAmount[msg.sender];
        (success, ) = payable (msg.sender).call{value: balance}("");
        require(success, "transfer tx failed");
        fundersToAmount[msg.sender] = 0;

        emit RefundByFunder(msg.sender, balance);
    }

    function setFunderToAmount(address funder, uint256 amountToUpdate) external {
        require(msg.sender == erc20Addr, "you do not have permission to call this function");
        fundersToAmount[funder] = amountToUpdate;
    }

    function setErc20Addr(address _erc20Addr) public onlyOwner {
        erc20Addr = _erc20Addr;
    }

    modifier windowNotClosed() {
        require(block.timestamp >= deployTimestamp + lockTime, "window is not closed");
        _;  // 其它操作
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "this function can only be called by owner");
        _;
    }
}