require('solidity-coverage')
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
// require("@nomicfoundation/hardhat-toolbox");
// require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-gas-reporter");
require("dotenv/config");

require("dotenv").config();

require("./tasks/tosV2_deploy");
require("./tasks/tosV2_phase1_market");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html

// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  live: false,
  networks: {
    hardhat: {
      chainId: 31337,
    },
    local: {
      chainId: 31337,
      url: `http://127.0.0.1:8545/`,
      timeout: 200000,
      // accounts: [`${process.env.PRIVATE_KEY}`,`${process.env.LOCAL_KEY}`,`${process.env.LOCAL_KEY2}`,`${process.env.LOCAL_KEY3}`,`${process.env.LOCAL_KEY4}`,`${process.env.LOCAL_KEY5}`,`${process.env.LOCAL_KEY6}`,`${process.env.LOCAL_KEY7}`]
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`,`${process.env.PRIVATE_KEY_2}`,`${process.env.PRIVATE_KEY_3}`],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`,`${process.env.PRIVATE_KEY_2}`,`${process.env.PRIVATE_KEY_3}`],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`],
      gasMultiplier: 1.25,
      gasPrice: 25000000000,
    },
  },
  localhost: {
    timeout: 1000000000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 1000000000,
  },
};
