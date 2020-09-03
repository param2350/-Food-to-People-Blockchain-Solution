const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
const options = {
  transactionConfirmationBlocks: 1,
    transactionBlockTimeout: 5,
    transactionPollingTimeout: 480
};
let web3;


	//WE ARE ON SERVER || NO METAMASK AVAILALE
const provider = new Web3.providers.HttpProvider(
	'https://rinkeby.infura.io/v3/1d30f418708f43a4ad0023cbdf77bc9e'
);
web3 = new Web3(provider);

/*
const provider = new HDWalletProvider(
	'swamp comic member radio reason alcohol long jealous surround valve poverty rabbit',
	'https://rinkeby.infura.io/v3/d5369735a7784bd2866968430ebccbcf'
);*/

module.exports= web3;
//THIS PROVIDER IS CONFIGURED FOR RINKEBY
//const web3 = new Web3(window.web3.currentProvider);
/*const web3 = new Web3(window.ethereum); //window IS ONLY AVAILABLE ON BROWSER
window.ethereum.enable();*/
