const { expect } = require("chai");


describe("Token contract", function () {

  let DesubToken;
  let deployedDesubToken;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let addrs;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("DesubToken");
    [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    deployedDesubToken = await Token.deploy("DESUB","DESUB");
    await deployedDesubToken.mint(addr1.address, 69);
    await deployedDesubToken.mint(addr1.address, 420);

  });

  describe("Deployment", function () {
 
    it("Should set the right owner", async function () {
      expect(await deployedDesubToken.owner()).to.equal(owner.address);
    });

  });

  describe("Minting", function(){

    it("Should be owned by the address specified by the to parameter after minting", async function () {
        expect(await deployedDesubToken.ownerOf(69)).to.equal(addr1.address);
    });

    it("Should return the balance of tokens a specific user has", async function () {
        expect(await deployedDesubToken.balanceOf(addr1.address)).to.equal(2);
    });

    it("Should return the tokenId of a token owned by a user at a specified index", async function () {
        expect(await deployedDesubToken.tokenOfOwnerByIndex(addr1.address, 1)).to.equal(420);
    });

    it("Should initialize the subTokenIncrementer to 0", async function () {
        expect(await deployedDesubToken.getNumberOfSubTokensSoldOfTokenID(69)).to.equal(0);
    });

    it("Should not allow minting to the 0 address", async function () {
        await expect(deployedDesubToken.mint('0x0000000000000000000000000000000000000000', 69)).to.be.reverted;
    });

    it("Should not allow minting of duplicate tokenIDs", async function() {
        await expect(deployedDesubToken.mint(addr1.address, 420)).to.be.reverted;
    });

    

  });

  describe("Purchase Sub Token", function(){

    it("Should require content price to be paid in order to purchase subToken", async function() {
        await expect(deployedDesubToken.purchaseSubToken(addr1.address, 420)).to.be.reverted;
    });

    it("Should increment the total sales referred of the address that referred the sale", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addr1.address, 420, overrides);
        expect(await deployedDesubToken.numberOfReferralsForTokenIDandAddress(420, addr1.address)).to.equal(1);
    });

    it("It should set the sequence purchased of the address that bought", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addr1.address, 420, overrides);
        expect(await deployedDesubToken.getSequenceOfPurchaseOfTokenIDByAddress(420,owner.address)).to.equal(1);
    });

    it("Should increment the next order counter", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addr1.address, 420, overrides);
        expect(await deployedDesubToken.getNumberOfSubTokensSoldOfTokenID(420)).to.equal(1);
    });

    it("Should not allow a sub token to be purchased for a tokenID that doesn’t exist", async function() {
        let overrides = {
            value: 417965181246200
        };
        await expect(deployedDesubToken.purchaseSubToken(addr1.address, 81)).to.be.reverted;
    });

    it("Should not allow an address to purchase more than one sub token for a token id", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addr1.address, 420, overrides);
        await expect(deployedDesubToken.purchaseSubToken(addr1.address, 420)).to.be.reverted;
    });

    it("Should not allow a referrer address that is not token or sub token owner", async function() {
        let overrides = {
            value: 417965181246200
        };
        await expect(deployedDesubToken.purchaseSubToken('0x0000000000000000000000000000000000000000', 420)).to.be.reverted;
    });

  });

  describe("Calculate Payouts", function(){

    it("Should calculate the right royalty payout for token holders", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addr1.address, 420, overrides);
        expect(await deployedDesubToken.getTokenHolderRoyaltyBalance(420)).to.equal(334372144996960);
    });

    it("Should calculate the right sharing reward for sub token holders", async function(){
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addr1.address, 420, overrides);
        expect(await deployedDesubToken.getSubTokenHolderRoyaltyBalance(addr1.address, 420)).to.equal(41796518124620);
    });

  });
  
});


