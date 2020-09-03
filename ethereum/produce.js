const web3 = require('./web3.js');
const CampaignFactory = require('./build/Produce.json');
const instance = new web3.eth.Contract(
	JSON.parse(CampaignFactory.interface),
	address
);	
//main: 0x6B6AbcFaE89F239bc502877f257639A06D2835ba
//second address for testing
//0x065F8A7b39BaB4b9599Eef4400633Ecec7BdDB0D
module.exports = instance;