require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 
 const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
 const ETHERSCAN_API_KEY = "BW9H8BJDSVGUN74XSY37273KN9NIMZ3CFY";


module.exports = {
  solidity: "0.8.11",
  networks: {
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/5Xb_GL5CDlq6KJyqvWPZFg8yjzCyjaE1`,
      accounts: [`${DEV_ACCOUNT_PRIVATE_KEY}`]
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/z8rzbsshgvAjR1SpHL8zWgGoHDdBZXFm`,
      accounts: [`${DEV_ACCOUNT_PRIVATE_KEY}`]
    },
    testnet_aurora: {
      url: 'https://testnet.aurora.dev',
      accounts: [`0x${DEV_ACCOUNT_PRIVATE_KEY}`],
      chainId: 1313161555,
      gasPrice: 120 * 10000000
    },
   
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY
  }
};
