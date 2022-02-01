require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 
 const ROPSTEN_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
 const ETHERSCAN_API_KEY = "BW9H8BJDSVGUN74XSY37273KN9NIMZ3CFY";
 const MUMBAI_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";

module.exports = {
  solidity: "0.8.11",
  networks: {
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/5Xb_GL5CDlq6KJyqvWPZFg8yjzCyjaE1`,
      accounts: [`${ROPSTEN_PRIVATE_KEY}`]
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/z8rzbsshgvAjR1SpHL8zWgGoHDdBZXFm`,
      accounts: [`${MUMBAI_PRIVATE_KEY}`]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY
  }
};
