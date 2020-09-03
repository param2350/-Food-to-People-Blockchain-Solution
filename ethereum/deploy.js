const HDWallerProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');
const compiledFactory = require('./build/ProduceFactory.json');

const options = {
  transactionConfirmationBlocks: 1
};

const provider = new HDWallerProvider(
	'swamp comic member radio reason alcohol long jealous surround valve poverty rabbit',
	'https://rinkeby.infura.io/v3/d5369735a7784bd2866968430ebccbcf'
);

const web3 = new Web3(provider);

const deploy = async () => {
	try{
	const accounts = await web3.eth.getAccounts();
	console.log('attempting to deply from accounts : ',accounts[0]);
	console.log('bytecode: ',compiledFactory.bytecode);
	const result = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
	.deploy({data: compiledFactory.bytecode})
	.send({gasLimit: '3000000',from: accounts[0]});
	console.log('Contract deployed to address : ',result.options.address);
}
catch(err){
	console.log(err);
}
};
deploy();
/*
const result = await new web3.eth.Contract(JSON.parse(interface))
     .deploy({data: '0x' + bytecode, arguments: ['Hi there!']}) // add 0x bytecode
     .send({from: accounts[0]}); // remove 'gas'*/
