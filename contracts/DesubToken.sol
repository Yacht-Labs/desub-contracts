// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol"; 
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";



contract DesubToken is ReentrancyGuard {

    using EnumerableSet for EnumerableSet.UintSet;
  
     // Name and symbol for the Desub content token contract
    string private _name;
    string private _symbol;

    // This is the content price that corresponds to $1 @ 2392 ETH 
    uint256 constant public universalContentPrice = 417965181246200;

    // These set the initial decay curve of the stack rewards
    uint256 constant private _zeroStackRewardPct = 120000;
    uint256 constant private _oneStackRewardPct = 110000;
    uint8 constant private _decayFactor = 91;

    // The owner of the Desub Token Contract
    address public owner;

    // This is the mapping of tokenIDs (content hashes) to owner addresses
    mapping(uint256 => address) private _contentTokenOwners;

    // This maps each address to an enumerable set of the tokenIds owned by that address
    mapping(address => EnumerableSet.UintSet) private _contentTokenHoldings;
    
    // Mapping owner address to token count
    mapping(address => uint256) private _balances;

    // This maps each tokenID to the current subToken purchase order incrementer
    // Each time a subToken is purchased from a tokenID this value is incremented one
    mapping(uint256 => uint256) private _subTokenIncrementers;

    // This maps each token ID to another mapping of sub token purchase sequences
    // For example if you were the 6th user to purchase a sub token the final value would be 6
    // This also can be used to check if an address owns a sub token of a particular tokenID
    // tokenID => purchaser => cardinal sequence
    mapping(uint256 => mapping(address => uint256)) private _subTokenPurchaseSequences;

    // This maps each token ID to another mapping that maps the purchase cardinal sequence to its corresponding stack reward percentage
    // tokenID => cardinal sequence => stack reward percentage
    mapping(uint256 => mapping(uint256 => uint256)) private _subTokenHolderStackRewardPct;

    // This maps each token ID to another mapping of the number of sub token sales an address has referred
    mapping(uint256 => mapping(address => uint256)) private _subTokenReferrals;

    // This maps each token ID to another mapping of the token owner address to the main royalty (80%) amount paid out
    // tokenID => token owner address => amount royalty paid
    mapping(uint256 => mapping(address => uint256)) private _tokenHolderRoyaltyPayouts;

    // This maps each token ID to another mapping of the sub token holder's address to their referral amount paid out
    // tokenID => sub token holder address => amount referral bonus paid
    mapping(uint256 => mapping(address => uint256)) private _subTokenHolderReferralPayouts;

    // This maps each token ID to another mapping of the sub token holder's address to their stack reward amount paid out
    // tokenID => sub token holder address => amount stack reward paid
    mapping(uint256 => mapping(address => uint256)) private _subTokenHolderStackRewardPayouts;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenID);

    //initialize the Desub Token Contract
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
        owner = msg.sender;
    }

    function _exists(uint256 tokenID) internal view returns (bool) {
        return _contentTokenOwners[tokenID] != address(0);
    }

    function _addressOwnsSubTokenOfTokenID(uint256 tokenID, address subTokenOwner) internal view returns (bool) {
        return _subTokenPurchaseSequences[tokenID][subTokenOwner] > 0;
    }

    function ownerOf(uint256 tokenID) public view returns (address) {
        address tokenOwner = _contentTokenOwners[tokenID];
        require(tokenOwner != address(0), "ERC721: owner query for nonexistent token");
        return tokenOwner;
    }

    function balanceOf(address tokenOwner) public view returns (uint256) {
        require(tokenOwner != address(0), "ERC721: balance query for the zero address");
        return _balances[tokenOwner];
    }

    function tokenOfOwnerByIndex(address tokenOwner, uint256 index) public view returns (uint256) {
        return _contentTokenHoldings[tokenOwner].at(index);
    }

 
    function numberOfReferralsForTokenIDandAddress(uint256 tokenID, address referrerAddress) public view returns (uint256){
        return _subTokenReferrals[tokenID][referrerAddress];
    }

    function getSequenceOfPurchaseOfTokenIDByAddress(uint256 tokenID, address purchaserAddress) public view returns (uint256){
        return _subTokenPurchaseSequences[tokenID][purchaserAddress];
    }

    function getNumberOfSubTokensSoldOfTokenID(uint256 tokenID) public view returns (uint256) {
        return _subTokenIncrementers[tokenID];
    }

    /* 
    ****************************************************************
    Calculate payouts for content token holders and subtoken holders 
    ****************************************************************
    */

    // Payout of 80% of all sub token proceeds to token holder
    function getTokenHolderRoyaltyGrossTotal(uint256 tokenID) public view returns (uint256) {
        uint256 totalRevenueForToken = _subTokenIncrementers[tokenID] * universalContentPrice;
        uint256 tokenRoyaltyForTokenOwner = (totalRevenueForToken * 80) / 100;

        console.log("%s sub token sales generate %s wei for the token holder", _subTokenIncrementers[tokenID], tokenRoyaltyForTokenOwner);
        return tokenRoyaltyForTokenOwner;
    }

    // Payout of 10% of all sub token sales that were referred by an address
    function getSubTokenHolderRoyaltyBalance(address subTokenHolder, uint256 tokenID) public view returns (uint256) {
        uint256 revenueReferrerHasGenerated = (numberOfReferralsForTokenIDandAddress(tokenID, subTokenHolder) * universalContentPrice);
        uint256 totalRoyaltiesEarnedByReferrer = (revenueReferrerHasGenerated) / 10;

        console.log("%s sub token sales generate %s wei for the referring sub token holder", numberOfReferralsForTokenIDandAddress(tokenID, subTokenHolder), totalRoyaltiesEarnedByReferrer);
        return totalRoyaltiesEarnedByReferrer;
    }

    // Payout of stack rewards determined by sub token purchase sequence
    function getSubTokenHolderStackRewardPct(address subTokenHolder, uint256 tokenID) public view returns (uint256) {
        uint256 sequence = getSequenceOfPurchaseOfTokenIDByAddress(tokenID, subTokenHolder);
        console.log("%s is the percentage of the %s (st/nd/rd/th) purchaser ", _subTokenHolderStackRewardPct[tokenID][sequence], sequence);
        return _subTokenHolderStackRewardPct[tokenID][sequence];
    }

    function getSubTokenHolderTotalStackReward(address subTokenHolder, uint256 tokenID) public view returns (uint256) {
        uint256 percentage = getSubTokenHolderStackRewardPct(subTokenHolder, tokenID);
        uint totalRevenueForToken = _subTokenIncrementers[tokenID] * universalContentPrice;

        // 381023030155                                             
        // Calculation is (totalRevenueForToken * stack percentage * 75) / (28000000 *              1000)
        //                                                         ^7.5%    ^stack reward factor    ^to get 7.5

        uint256 reward = (totalRevenueForToken * percentage * 75) / (28000000 * 1000);
        console.log("%s is the reward of the %s pot", reward, totalRevenueForToken);

        return reward;
    }

    /* 
    ****************************************************************
    Read amount paid out to content and sub token holders
    ****************************************************************
    */

    // Read royalty amount paid out to content token holder
    function getTokenHolderRoyaltyPaidOut(uint256 tokenID) public view returns (uint256) {
        require(msg.sender == _contentTokenOwners[tokenID], "Only the owner of this content token can see their royalty payouts");
        return _tokenHolderRoyaltyPayouts[tokenID][msg.sender];
    }

    // Read referral royalty amount paid out to sub token holder
    function getSubTokenHolderReferralRoyaltyPaidOut(uint256 tokenID) public view returns (uint256) {
        require(_addressOwnsSubTokenOfTokenID(tokenID, msg.sender),"Only the owner of this sub token can see their referral royalty payouts");
        return _subTokenHolderReferralPayouts[tokenID][msg.sender];
    }

    // Read stack reward amount paid out to sub token holder
    function getSubTokenHolderStackRewardPaidOut(uint256 tokenID) public view returns (uint256) {
        require(_addressOwnsSubTokenOfTokenID(tokenID, msg.sender),"Only the owner of this sub token can see their stack reward payouts");
        return _subTokenHolderStackRewardPayouts[tokenID][msg.sender];
    }

    /* 
    ****************************************************************
    Send payouts to content and sub token holders
    ****************************************************************
    */
    
    // Send content token royalty payout
    function payOutTokenHolderRoyalty(uint256 tokenID, uint256 amount, address to) public nonReentrant {
        require(msg.sender == _contentTokenOwners[tokenID], "Only the owner of this content token can request royalty payout");
        require(amount > 0, "Payout amount must be greater than 0");

        uint256 amountOwed = getTokenHolderRoyaltyGrossTotal(tokenID) - _tokenHolderRoyaltyPayouts[tokenID][msg.sender];
        console.log("%s is owed to %s", amountOwed, msg.sender);
        require(amountOwed >= amount, "Can't pay out more than what is owed to you");

        // Increment amount paid out 
        _tokenHolderRoyaltyPayouts[tokenID][msg.sender] += amount;
      
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed.");

    }

    // Send sub token referral royalty payout
    function payOutSubTokenHolderReferralRoyalty(uint256 tokenID, uint256 amount, address to) public nonReentrant {
        require(_addressOwnsSubTokenOfTokenID(tokenID, msg.sender),"Only the owner of this sub token can request their referral royalty payouts");
        require(amount > 0, "Payout amount must be greater than 0");

        uint256 amountOwed = getSubTokenHolderRoyaltyBalance(msg.sender, tokenID) - _subTokenHolderReferralPayouts[tokenID][msg.sender];
        require(amountOwed >= amount, "Can't pay out more than what is owed to you");

        _subTokenHolderReferralPayouts[tokenID][msg.sender] += amount;

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed.");

    }

    // Send sub token stack reward payout
    function payOutSubTokenHolderStackReward(uint256 tokenID, uint256 amount, address to) public nonReentrant {
        require(_addressOwnsSubTokenOfTokenID(tokenID, msg.sender),"Only the owner of this sub token can request their stack reward payouts");
        require(amount > 0, "Payout amount must be greater than 0");

        uint256 amountOwed = getSubTokenHolderTotalStackReward(msg.sender, tokenID) - _subTokenHolderStackRewardPayouts[tokenID][msg.sender];
        require(amountOwed >= amount, "Can't pay out more than what is owed to you");

        _subTokenHolderStackRewardPayouts[tokenID][msg.sender] += amount;

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed.");

    }

    /* 
    ****************************************************************
    Mint content token and purchase sub tokens
    ****************************************************************
    */

    // Mints content token, tokenID should be the content hash 
    function mint(address to, uint256 tokenID) public {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenID), "ERC721: token already minted");

        _contentTokenOwners[tokenID] = to;

        _balances[to] += 1;

        _contentTokenHoldings[to].add(tokenID);

        _subTokenIncrementers[tokenID] = 0;

        emit Transfer(address(0), to, tokenID);
    }

    function purchaseSubToken(address referrer, uint256 tokenID) public payable {
        require(msg.value >= universalContentPrice, "Insufficient funds paid to purchase sub token");
        require(_exists(tokenID), "Cannot purchase a non existant tokenID");
        require(_subTokenPurchaseSequences[tokenID][msg.sender] == 0, "Address has already purchased sub token");
        require(_addressOwnsSubTokenOfTokenID(tokenID, referrer) || referrer == ownerOf(tokenID),"Invalid referrer address, make sure referrer owns token or sub token of this tokenID");

        // This increments the sub token sequence globally for the tokenID
        _subTokenIncrementers[tokenID] += 1;

        // This increments the referals for the referring address
        _subTokenReferrals[tokenID][referrer] += 1;

        // This sets the sequence that the sub token holder purchased to calculate their stack reward level
        uint256 purchaseSequence = _subTokenIncrementers[tokenID];
        _subTokenPurchaseSequences[tokenID][msg.sender] = purchaseSequence;

        // This sets the stack reward percentage
        if(purchaseSequence == 1) {
            _subTokenHolderStackRewardPct[tokenID][purchaseSequence] = _oneStackRewardPct;
        } else if(purchaseSequence <= 3580) {
            uint256 twoBack;
            uint256 oneBack;

            if(purchaseSequence == 2)  {
                twoBack = _zeroStackRewardPct;
                oneBack = _oneStackRewardPct;
            } else {
                twoBack = _subTokenHolderStackRewardPct[tokenID][purchaseSequence - 2];
                oneBack = _subTokenHolderStackRewardPct[tokenID][purchaseSequence - 1];
            }

            _subTokenHolderStackRewardPct[tokenID][purchaseSequence] = oneBack - (((twoBack - oneBack) * _decayFactor) / 100);

        } else {
            _subTokenHolderStackRewardPct[tokenID][purchaseSequence] = 0;
        }

    }

}