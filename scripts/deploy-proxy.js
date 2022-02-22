const { ethers, upgrades } = require("hardhat");

async function main() {
  
    const DesubToken = await ethers.getContractFactory("DesubToken");
    const desubToken = await upgrades.deployProxy(Box, ["Desub Content Token","DESUB"]);
    await desubToken.deployed();
    console.log("DesubToken deployed to:", desubToken.address);

  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });