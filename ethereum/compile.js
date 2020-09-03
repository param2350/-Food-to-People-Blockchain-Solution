const path = require('path');
const solc = require('solc');
const fs = require('fs-extra');

const buildPath = path.resolve(__dirname, 'build');
fs.removeSync(buildPath); //DELETE BUILD FOLDER

//COMPILE SOURCE CODE
try{
	const campaignPath = path.resolve(__dirname, 'contracts','Produce.sol');
	const source = fs.readFileSync(campaignPath, 'utf8');
	const output = solc.compile(source, 1).contracts;

	fs.ensureDirSync(buildPath); //CREATE THE BUILD FOLDER

	for(let contract in output){ //ITERATE OVER :Campaign & :CampaignFactory
		fs.outputJsonSync(  //WRITE OUT A JSON FILE IN PATH GIVEN
			path.resolve(buildPath, contract.replace(':','') +'.json'),
			output[contract]
		);
	}
}
catch(err){
	console.log(err);
}

