const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Token contract", function () {

  let DesubToken;
  let deployedDesubToken;
  let owner;
  let addrs;
  

  beforeEach(async function () {

    // Get the ContractFactory and Signers here.
    [owner, ...addrs] = await ethers.getSigners();

    DesubToken = await ethers.getContractFactory("DesubToken");
   
    deployedDesubToken = await upgrades.deployProxy(DesubToken,["Desub Content Token","DESUB"]);
    await deployedDesubToken.deployed();

    await deployedDesubToken.mint(addrs[0].address, 69);
    await deployedDesubToken.mint(addrs[0].address, 420);

  });

  describe("Deployment", function () {
 
    it("Should set the right owner (0)", async function () {
        expect(await deployedDesubToken.owner()).to.equal(owner.address);
    });

  });

  describe("Minting", function(){

    it("Should be owned by the address specified by the to parameter after minting (1)", async function () {
        expect(await deployedDesubToken.ownerOf(69)).to.equal(addrs[0].address);
    });

    it("Should return the balance of tokens a specific user has (2)", async function () {
        expect(await deployedDesubToken.balanceOf(addrs[0].address)).to.equal(2);
    });

    it("Should return the tokenId of a token owned by a user at a specified index (3)", async function () {
        expect(await deployedDesubToken.tokenOfOwnerByIndex(addrs[0].address, 1)).to.equal(420);
    });

    it("Should initialize the subTokenIncrementer to 0 (4)", async function () {
        expect(await deployedDesubToken.getNumberOfSubTokensSoldOfTokenID(69)).to.equal(0);
    });

    it("Should not allow minting to the 0 address (5)", async function () {
        await expect(deployedDesubToken.mint('0x0000000000000000000000000000000000000000', 69)).to.be.reverted;
    });

    it("Should not allow minting of duplicate tokenIDs (6)", async function() {
        await expect(deployedDesubToken.mint(addrs[0].address, 420)).to.be.reverted;
    });

    

  });

  describe("Purchase Sub Token", function(){

    it("Should require content price to be paid in order to purchase subToken (7)", async function() {
        await expect(deployedDesubToken.purchaseSubToken(addrs[0].address, 420)).to.be.reverted;
    });

    it("Should increase the contract address balance by the content price (8)", async function() {
        let initialBalance = await ethers.provider.getBalance(deployedDesubToken.address);
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        
        let finalBalance = await ethers.provider.getBalance(deployedDesubToken.address);

        expect(finalBalance - initialBalance).to.equal(417965181246200);
    });

    it("Should increment the total sales referred of the address that referred the sale (9)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        expect(await deployedDesubToken.numberOfReferralsForTokenIDandAddress(420, addrs[0].address)).to.equal(1);
    });

    it("It should set the sequence purchased of the address that bought (10)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        expect(await deployedDesubToken.getSequenceOfPurchaseOfTokenIDByAddress(420,owner.address)).to.equal(1);
    });

    it("Should increment the next order counter (11)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        expect(await deployedDesubToken.getNumberOfSubTokensSoldOfTokenID(420)).to.equal(1);
    });

    it("Should not allow a sub token to be purchased for a tokenID that doesn’t exist (12)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await expect(deployedDesubToken.purchaseSubToken(addrs[0].address, 81)).to.be.reverted;
    });

    it("Should not allow an address to purchase more than one sub token for a token id (13)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        await expect(deployedDesubToken.purchaseSubToken(addrs[0].address, 420)).to.be.reverted;
    });

    it("Should not allow a referrer address that is not token or sub token owner (14)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await expect(deployedDesubToken.purchaseSubToken('0x0000000000000000000000000000000000000000', 420)).to.be.reverted;
    });

    it("Should increment the stack reward percentage each time a sub token is sold (15)", async function(){
        var overrides = {     
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[3]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).purchaseSubToken(addrs[0].address, 420, overrides);

        expect(await deployedDesubToken.getSubTokenHolderStackRewardPct(addrs[4].address, 420)).to.equal(85084);
    });

  });

  describe("Ability to claim content token holder royalty payouts", function(){

    it("Should tell the token holder the total rewards they have earned for this token (16)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        expect(await deployedDesubToken.getTokenHolderRoyaltyGrossTotal(420)).to.equal(334372144996960);
    });

    it("Should send payment to the token holder wallet up to the amount they are owed (17)", async function() {
        let initialBalance = await addrs[4].getBalance();
        
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[0]).payOutTokenHolderRoyalty(420, 88000, addrs[4].address);
      
        let finalBalance = await addrs[4].getBalance();

        //console.log(finalBalance.sub(initialBalance));
      
        expect(finalBalance.sub(initialBalance).toNumber()).to.equal(88000);
    });

    it("Should tell the token holder the total rewards they have been paid out for this token (18)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[0]).payOutTokenHolderRoyalty(420, 88000, addrs[4].address);

        expect(await deployedDesubToken.connect(addrs[0]).getTokenHolderRoyaltyPaidOut(420)).to.equal(88000);
    });

    it("Should not allow user to claim a negative payout (19)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        await expect(deployedDesubToken.connect(addrs[0]).payOutTokenHolderRoyalty(420, -88000, addrs[4].address)).to.be.reverted;
        
    });

    it("Should not allow a user to claim more than what they are owed (20)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        await expect(deployedDesubToken.connect(addrs[0]).payOutTokenHolderRoyalty(420, 334372144996961, addrs[4].address)).to.be.reverted;
        
    });

    it("Should only allow the owner of content token to send payout (21)", async function() {
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
        await expect(deployedDesubToken.connect(addrs[2]).payOutTokenHolderRoyalty(420, 334372144996961, addrs[4].address)).to.be.reverted;
        
        
    });

  });


    
  describe("Ability to claim sub token holder referral payouts", function(){

    it("Should calculate the correct sharing reward for sub token holders (22)", async function(){
            let overrides = {
                value: 417965181246200
            };
            await deployedDesubToken.purchaseSubToken(addrs[0].address, 420, overrides);
            expect(await deployedDesubToken.getSubTokenHolderRoyaltyBalance(addrs[0].address, 420)).to.equal(41796518124620);
    });

    it("Should send payment to the sub token holder wallet up to the amount they are owed (23)", async function(){
        let initialBalance = await addrs[4].getBalance();
        
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[1].address, 420, overrides);
        await deployedDesubToken.connect(addrs[1]).payOutSubTokenHolderReferralRoyalty(420, 88000, addrs[4].address);
      
        let finalBalance = await addrs[4].getBalance();

        //console.log(finalBalance.sub(initialBalance));
      
        expect(finalBalance.sub(initialBalance).toNumber()).to.equal(88000);
    });

    it("Should tell the sub token holder the total referral rewards they have been paid out for this token (24)", async function(){
        let initialBalance = await addrs[4].getBalance();
        
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[1].address, 420, overrides);
        await deployedDesubToken.connect(addrs[1]).payOutSubTokenHolderReferralRoyalty(420, 88000, addrs[4].address);

        expect(await deployedDesubToken.connect(addrs[1]).getSubTokenHolderReferralRoyaltyPaidOut(420)).to.equal(88000);
    });

    it("Should not allow sub token holder to claim a negative payout (25)", async function(){
        let initialBalance = await addrs[4].getBalance();
        
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[1].address, 420, overrides);

        await expect(deployedDesubToken.connect(addrs[1]).payOutSubTokenHolderReferralRoyalty(420, -88000, addrs[4].address)).to.be.reverted;
    });

    it("Should not allow a sub token holder to claim more than what they are owed (26)", async function(){
        let initialBalance = await addrs[4].getBalance();
        
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[1].address, 420, overrides);

        await expect(deployedDesubToken.connect(addrs[1]).payOutSubTokenHolderReferralRoyalty(420, 41796518124621, addrs[4].address)).to.be.reverted;
    });

    it("Should only allow the owner of sub token to send payout (27)", async function(){
        let initialBalance = await addrs[4].getBalance();
        
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[1].address, 420, overrides);

        await expect(deployedDesubToken.connect(addrs[3]).payOutSubTokenHolderReferralRoyalty(420, 88000, addrs[4].address)).to.be.reverted;
    });

  });

  describe("Ability to claim sub token holder stack reward payouts", function(){

    it("Should tell the sub token holder the total stack rewards they have earned for this token (28)", async function(){
       
        var overrides = {     
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[3]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).purchaseSubToken(addrs[0].address, 420, overrides);
    
        expect(await deployedDesubToken.getSubTokenHolderTotalStackReward(addrs[4].address, 420)).to.equal(381023030155);
    });

    it("Should send payment to the sub token holder wallet up to the amount they are owed (29)", async function(){
        let initialBalance = await addrs[6].getBalance();
        
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[3]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).payOutSubTokenHolderStackReward(420, 88000, addrs[6].address);
      
        let finalBalance = await addrs[6].getBalance();

        //console.log(finalBalance.sub(initialBalance));
      
        expect(finalBalance.sub(initialBalance).toNumber()).to.equal(88000);
    });

    it("Should tell the sub token holder the total stack rewards they have been paid out for this token (30)", async function(){
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[3]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).payOutSubTokenHolderStackReward(420, 88000, addrs[6].address);

        expect(await deployedDesubToken.connect(addrs[4]).getSubTokenHolderStackRewardPaidOut(420)).to.equal(88000);
    });

    it("Should not allow sub token holder to claim a negative payout (31)", async function(){
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[3]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).purchaseSubToken(addrs[0].address, 420, overrides);
        await expect(deployedDesubToken.connect(addrs[4]).payOutSubTokenHolderStackReward(420, 381023030156, addrs[6].address)).to.be.reverted;
    });

    it("Should not allow a sub token holder to claim more than what they are owed (32)", async function(){
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[3]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).purchaseSubToken(addrs[0].address, 420, overrides);
        await expect(deployedDesubToken.connect(addrs[4]).payOutSubTokenHolderStackReward(420, -88000, addrs[6].address)).to.be.reverted;
    });

    it("Should only allow the owner of sub token to send payout (33)", async function(){
        let overrides = {
            value: 417965181246200
        };
        await deployedDesubToken.connect(addrs[1]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[2]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[3]).purchaseSubToken(addrs[0].address, 420, overrides);
        await deployedDesubToken.connect(addrs[4]).purchaseSubToken(addrs[0].address, 420, overrides);
        await expect(deployedDesubToken.connect(addrs[5]).payOutSubTokenHolderStackReward(420, 88000, addrs[6].address)).to.be.reverted;
    });



  });

  describe("Upgradeable", function() {
    it('Should be upgradeable', async () => {
      const DesubTokenV2 = await ethers.getContractFactory("DesubTokenV2");
      const upgraded = await upgrades.upgradeProxy(deployedDesubToken.address, DesubTokenV2);
  
      console.log(deployedDesubToken.address);
      console.log(upgraded.address);

      const value = await upgraded.upgradeTest();
      expect(value).to.equal(88);
    });
  });
  
});


