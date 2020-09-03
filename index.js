var express = require("express");
var app=express();
var web3 = require('./ethereum/web3.js');
var factory = require('./ethereum/factory.js');
const Tx = require('ethereumjs-tx').Transaction;
var Produce = require('./ethereum/build/Produce.json');
var mongooose=require('mongoose');
//var Tile=require("./models/tile.js");
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

//GLOBAL VARS
//const account = '0x24a7f0A7d52ee1e14Fd9B65210737eD034231f7c'
//const private_key = '385736EBA8F35D7C8EF9BE2F48AC2E7C4A65073A40081E0F56B70AB5BBAC98E7';
const account='0x7031CaD030F7D41b751ee7b199cA10ca72F184D1';
const private_key = '86ABC2B8A20DC644B68D6BCC198D57177D1D0B5CF68FCC2DBAD10FBB114050CC';
const url = 'mongodb+srv://onebond:onebond@cluster0-uqs2c.mongodb.net/test?retryWrites=true';
//FOLLOWING URL IS USED ONLY FOR LOGIN FUNCTIONALITY AND RETAILER ADDRESS
const urlLogin = "mongodb+srv://onebond:onebond@cluster0-lv3ox.mongodb.net/test?retryWrites=true&w=majority";


var bodyParser  = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", async function(req,res){
	res.send("HOME PAGE");
});

//LOGIN ROUTE
app.post("/login", async function(req,res) {
	const usertype=req.body.usertype;
	const username=req.body.username;
	const password=req.body.password;

	//VERIFY WITH MONGODB ACCOUNT 2
	MongoClient.connect(urlLogin, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");

		const cursor= await db.collection('users').findOne({"usertype": usertype, "username": username, "password": password});
		assert.equal(null, err);
	  	client.close();
		if(cursor==null) {
			res.send("failure");
		} else {
			res.send("success");
		}		
	});
});

//SHOW ALL PRODUCES
app.get("/produces", async function(req,res){
	try{
		const produces = await factory.methods.getAllDeployedProduces().call();
		console.log(produces.length);
		res.json({produces});
	}
	catch(err){
		res.json({err});
	}
});

//TESTING ROUTE
app.get("/test", async function(req,res){

});

//CREATE NEW PRODUCE
app.post("/produces",async function(req,res){
	try{

		//GETTING VALUES FROM REQ BODY
        const farmerId=req.body.farmerId;
        const location=req.body.location;
        const cropName=req.body.cropName;
        const cropQty=parseInt(req.body.cropQty);
        const timeStamp=req.body.timeStamp;
        const fertilizerName=req.body.fertilizerName;
        const foodProcessorId=req.body.foodProcessorId;
        const expiryDate=req.body.expiryDate;

        //PREP DATA AND SEND TO BLOCKCHAIN
		const contractFunction = factory.methods.newProduce(farmerId,location,cropName);
		const functionAbi = contractFunction.encodeABI();
		let estimatedGas;
		let nonce;
		var _nonce = await web3.eth.getTransactionCount(account);
		//console.log("Getting gas estimate");
		var gasAmount = await contractFunction.estimateGas({from: account});
		estimatedGas = gasAmount.toString(16);
		console.log("got here");
		  // construct the Tx data
		const rawTx = {
		    //gasPrice: '0x09184e72a000',
		    gasLimit: web3.utils.toHex(5000000),
		    to: '0xCfCbB834a17Cf20604c84104820C779Db36Ea4aB',
		    from: account,
		    data: functionAbi,
		    nonce: _nonce
		    };

		//sign Tx
		var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
		var ans=await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);

		//var receipt = await web3.eth.getTransactionReceipt(ans.transactionHash);
		if(ans){
			try{
				console.log("got here");
				//==========================INIT 2nd HALF OF CONTRACT =======================================
				const lastProduce = await factory.methods.lastProduce().call();
				const produce = new web3.eth.Contract(
					JSON.parse(Produce.interface),
					lastProduce
				);
				const initFunc = await produce.methods.initHalfVars(cropQty,timeStamp,fertilizerName,foodProcessorId,expiryDate);
				const functionAbi = initFunc.encodeABI();
				let estimatedGas;
				let nonce;
				var _nonce = await web3.eth.getTransactionCount(account);
				//console.log("Getting gas estimate");
				var gasAmount = await initFunc.estimateGas({from: account});
				estimatedGas = gasAmount.toString(16);

				  // construct the Tx data
				const rawTx = {
				    //gasPrice: '0x09184e72a000',
				    gasLimit: web3.utils.toHex(3000000),
				    to: lastProduce,
				    from: account,
				    data: functionAbi,
				    nonce: _nonce
				    };

				//sign Tx
				var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
				var ans=await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);
				//var receipt = await web3.eth.getTransactionReceipt(ans.transactionHash);
				if(ans){

					//SEND TO MONGODB ATLAS
			        MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
						const db = client.db("fotope");
						await db.collection('farmer_unsent').insertOne({
							farmerId: farmerId,
							 cropName: cropName,
							 cropQty: cropQty,
							 produceAddress: lastProduce,
							 fpId: foodProcessorId
						})
						.then(function(result) {
						  // process result
						  console.log(result);
						})
					//INSERT IN GOVT DB
						await db.collection('gov').insertOne({
							farmerId: farmerId,
							 cropName: cropName,
							 cropQty: cropQty,
							 produceAddress: lastProduce,
							 fpId: foodProcessorId,
							 verificationStatus: "unverified"
						})
					  assert.equal(null, err);
					  client.close();
					res.send("success");
					});
					
				}
				else
					res.json({err});
			}
			catch(err){
				console.log(err);
				res.json({err});
			}
		}
		else
			res.send("Produce creation unsuccessful!!");

	}
	catch(err){
		console.log(err);
		res.json({err});
	}
});

//RETURN UNDISPATCHED PRODUCES TO THE APP : LISTVIEW
app.get("/farmerUndispatchedProduces/:farmerId", async function(req,res) {
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('farmer_unsent').find({"farmerId":req.params.farmerId}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.send("error");
	}
});

//VIEW A PARTICULAR UNDISPATCHED PRODUCE : HAS BTN 'DISPATCH NOW'
app.get("/farmerViewUndispatchedProduces/:address", async function(req,res){
	try{
		const produce = new web3.eth.Contract(
					JSON.parse(Produce.interface),
					req.params.address
				);
		const produceDetail = await produce.methods.getDataBeforeDispatch().call();
		res.json({produceDetail});
	}
	catch(err){
		res.json({err});
	}
});

//FARMER DISPATCHES THE PRODUCE
app.post("/produces/:address", async function(req,res){
	//1. UPDATE TIMESTAMP IN BC (dispatchDate)
	try{
		//GETTING VALUES FROM REQ BODY
        const address=req.params.address;
        const dispatchDate=req.body.dispatchDate;

        //PREP DATA AND SEND TO BLOCKCHAIN
        const produce = new web3.eth.Contract(
					JSON.parse(Produce.interface),
					address
				);
		const contractFunction = produce.methods.dispatchProduce(dispatchDate);
		const functionAbi = contractFunction.encodeABI();
		let estimatedGas;
		let nonce;
		var _nonce = await web3.eth.getTransactionCount(account);
		//console.log("Getting gas estimate");
		var gasAmount = await contractFunction.estimateGas({from: account});
		estimatedGas = gasAmount.toString(16);
		  // construct the Tx data
		const rawTx = {
		    //gasPrice: '0x09184e72a000',
		    gasLimit: web3.utils.toHex(5000000),
		    to: address,
		    from: account,
		    data: functionAbi,
		    nonce: _nonce
		    };

		//sign Tx
		var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
		var ans=await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);

		if(ans){

		//2. MONGODB : MOVE REC FROM farmer_unsent TO farmer_all_old
		//3. MONGODB : CREATE A COPY OF ABOVE RECORD IN fp_unreceived
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");

		const cursor=await db.collection('farmer_unsent').findOne({
		 produceAddress: address
		});
		farmerId=cursor.farmerId;
		cropName=cursor.cropName;
		cropQty=cursor.cropQty;
		produceAddress=cursor.produceAddress;
		fpId=cursor.fpId;
		var ob={farmerId,cropName,cropQty,produceAddress,fpId};
		console.log(ob);

		//INSERT IN OLD
		await db.collection('farmer_all_old').insertOne(ob)
		.then(function(result) {
		  // process result
		  console.log(result.ops[0]);
		});

		//INSERT IN fp_unreceived
		await db.collection('fp_unreceived').insertOne(ob)
		.then(function(result) {
		  // process result
		  console.log(result.ops[0]);
		});

		//DEL
		await db.collection('farmer_unsent').deleteOne({"produceAddress":address})
		.then(function(result) {
		  // process result
		  console.log(result);
		});

	  assert.equal(null, err);
	  client.close();
	});
		res.send("Dispatch success");

		}
		else{
			res.send("Failed to dispatch produce");
		}
	}
	catch(err){
		res.send("Error occurred");
	}
});

//FARMER VIEWS OLD PRODUCES
app.get("/farmerOldProduces/:farmerId", async function(req, res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('farmer_all_old').find({"farmerId":req.params.farmerId}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.json({err});
	}
});


// ====================================================================================================================================
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  FP ROUTES XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx

app.get("/fpUnreceivedProduces/:fpId", function (req,res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('fp_unreceived').find({"fpId":req.params.fpId}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.send("error");
	}
});

//VIEW A PARTICULAR PRODUCE (BEFORE CLICKING "RECEIVED NOW")
app.get("/produces/:address/beforeFpReceives", async function(req,res) {
	try{
		const produce = new web3.eth.Contract(
					JSON.parse(Produce.interface),
					req.params.address
				);
		const produceDetail = await produce.methods.getDataBeforeReceivedByFp().call();
		res.json({produceDetail});
	}
	catch(err){
		res.json({err});
	}
});	

//FP RECEIVES
app.post("/produces/:address/fpReceives", async function(req, res) {
	//1. UPDATE timestamp AND QtyReceived

	try{
		//GETTING VALUES FROM REQ BODY
        const fp_timestamp=req.body.fp_timestamp;
        const qty_received = parseInt(req.body.qty_received);
				let address = req.params.address;

        //PREP DATA AND SEND TO BLOCKCHAIN
        const produce = new web3.eth.Contract(
					JSON.parse(Produce.interface),
					address
				);
		const contractFunction = produce.methods.FPReceivesCrop(fp_timestamp, qty_received);
		const functionAbi = contractFunction.encodeABI();
		let estimatedGas;
		let nonce;
		var _nonce = await web3.eth.getTransactionCount(account);
		//console.log("Getting gas estimate");
		var gasAmount = await contractFunction.estimateGas({from: account});
		estimatedGas = gasAmount.toString(16);
		  // construct the Tx data
		const rawTx = {
		    //gasPrice: '0x09184e72a000',
		    gasLimit: web3.utils.toHex(5000000),
		    to: address,
		    from: account,
		    data: functionAbi,
		    nonce: _nonce
		    };

		//sign Tx
		var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
		var ans=await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);

		if(ans){
		//2. MONGODB : MOVE REC FROM fp_unreceived TO fp_unprocessed
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");

		const cursor=await db.collection('fp_unreceived').findOne({
		 produceAddress: address
		});
		farmerId=cursor.farmerId;
		cropName=cursor.cropName;
		cropQty=cursor.cropQty;
		produceAddress=cursor.produceAddress;
		fpId=cursor.fpId;
		var ob={farmerId:farmerId,cropName:cropName,cropQty:cropQty,produceAddress:produceAddress,fpId:fpId};
		console.log("==============================="+ob);

		//2. MONGODB : INSERT IN fp_unprocessed
		await db.collection('fp_unprocessed').insertOne(ob)
		.then(function(result) {
		  // process result
		  console.log(result.ops[0]);
		});

		await db.collection('fp_unreceived').deleteOne({"produceAddress":address})
		.then(function(result) {
		  // process result
		  console.log(result);
		});

	  assert.equal(null, err);
	  client.close();
	});
		res.send("FPreceive success");

		}
		else{
			res.send("Failed to recieve produce");
		}
	}
	catch(err){
		res.send("Error occurred");
	}

});

//LST OF UNPROCESSED PRODUCES
app.get("/fpUnProcessedProduces/:fpId", function (req,res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('fp_unprocessed').find({"fpId":req.params.fpId}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.send("error");
	}
});

//GET THE MSP FROM PORTAL
app.get("/getMSP/:cropName", async function(req, res) {
	MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
	const db = client.db("fotope");
	const cursor= await db.collection('crops').findOne({"crop_name": req.params.cropName});
	assert.equal(null, err);
  	client.close();
	if(cursor==null)
		res.send("error");
	else
		res.send(cursor.crop_price);	
	});
});

//FP PROCESSING COMPLETE
app.post("/produces/fpProcesses/:address", async function(req, res) {
	//1. CALL processingComplete() : UPDATE msp, finalPrice, adulterationTest

	const address = req.params.address;
	const _msp = parseInt(req.body.msp);
	const _finalPrice = parseInt(req.body.finalPrice);
	const _adulterationTest = (req.body.adulterationTest == 'true');

	try {
		const produce = new web3.eth.Contract(
			JSON.parse(Produce.interface),
			address)

			const processingComplete = produce.methods.processingComplete(_msp, _finalPrice, _adulterationTest);
			const functionAbi = processingComplete.encodeABI();
			let estimatedGas;
			let nonce;
			var _nonce = await web3.eth.getTransactionCount(account);
			//console.log("Getting gas estimate");
			var gasAmount = await processingComplete.estimateGas({
				from: account
			});
			estimatedGas = gasAmount.toString(16);
			// construct the Tx data
			const rawTx = {
				//gasPrice: '0x09184e72a000',
				gasLimit: web3.utils.toHex(5000000),
				to: address,
				from: account,
				data: functionAbi,
				nonce: _nonce
			};

			//sign Tx
			var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
			var ans = await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);

			if(ans) {
				MongoClient.connect(url, {
					useNewUrlParser: true,
					useUnifiedTopology: true
				}, async function (err, client) {
					const db = client.db("fotope");

					const cursor = await db.collection('fp_unprocessed').findOne({
						produceAddress: address
					});
					farmerId = cursor.farmerId;
					cropName = cursor.cropName;
					cropQty = cursor.cropQty;
					produceAddress = cursor.produceAddress;
					fpId = cursor.fpId;
					var ob = {
						farmerId: farmerId,
						cropName: cropName,
						cropQty: cropQty,
						produceAddress: produceAddress,
						fpId: fpId
					};
					//INSERT IN fp_unsent
					await db.collection('fp_unsent').insertOne(ob)
					.then(function(result) {
					// process result
					console.log(result.ops[0]);
					});

					//DEL
					await db.collection('fp_unprocessed').deleteOne({"produceAddress":address})
					.then(function(result) {
					// process result
					console.log(result);
					});
					assert.equal(null, err);
	  				client.close();
				})
				res.send("processed successfully");
		}
		else
		{
			res.send("Failed to process");
		}
	} catch(err) {
		console.log(err)
	}
});

//LST OF UNSENT PRODUCES
app.get("/fpUnsentProduces/:fpId", function (req,res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('fp_unsent').find({"fpId":req.params.fpId}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.send("error");
	}
});

//GET PHYSICAL ADDRESS OF RETAILER
app.get("/getRetailerAddress/:retId", async function(req, res) {
	
	MongoClient.connect(urlLogin, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
	const db = client.db("fotope");
	const cursor= await db.collection('retailer_address').findOne({"retailer_id": req.params.retId});
	assert.equal(null, err);
  	client.close();
	if(cursor==null)
		res.send("error");
	else{
		res.send(cursor.retailer_address);
	}
	});
});

//FP DISPATCHES
app.post("/produces/fpDispatches/:address", async function(req,res) {
	//1. CALL addRetailer() : UPDATE retailerId, string retailer_address, uint256 qty, string dispatch_timestamp, string newBarcode

	//2. MONGODB : TRANSFER FROM fp_unsent TO fp_old

	//3. MONGODB : CREATE A COPY OF ABOVE IN retailer_unreceived

	//1. CALL addRetailer() : UPDATE retailerId, string retailer_address, uint256 qty, string dispatch_timestamp, string newBarcode
	const address = req.params.address;
	const retailerId = req.body.retailerId;
	const retailer_address = req.body.retailer_address;
	const qty = parseInt(req.body.qty);
	const dispatch_timestamp = req.body.dispatch_timestamp;
	const newBarcode = req.body.newBarcode;
	const cropName = req.body.cropName;
	try {
		const produce = new web3.eth.Contract(
			JSON.parse(Produce.interface),
			address);

			//CALCULATE REMAINING QTY
		let qtyRemaining = await produce.methods.cropQty().call();
		let fpId = await produce.methods.foodProcessor().call();
		console.log(qtyRemaining);
		qtyRemaining = parseInt(qtyRemaining) - qty;
		console.log(qtyRemaining);
		//UPDATE DATA IN fp_unsent
		if (qtyRemaining > 0) {
			console.log("inside");
			const addRetailer = await produce.methods.addRetailer(retailerId, retailer_address, qtyRemaining, dispatch_timestamp, newBarcode);
			const functionAbi = addRetailer.encodeABI();
			let estimatedGas;
			let nonce;
			var _nonce = await web3.eth.getTransactionCount(account);
			//console.log("Getting gas estimate");
			var gasAmount = await addRetailer.estimateGas({
				from: account
			});
			estimatedGas = gasAmount.toString(16);
			// construct the Tx data
			const rawTx = {
				//gasPrice: '0x09184e72a000',
				gasLimit: web3.utils.toHex(5000000),
				to: address,
				from: account,
				data: functionAbi,
				nonce: _nonce
			};

			//sign Tx
			var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
			var ans = await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);

			if (ans) {
				console.log("hereeeeeeeeeee");
				const produceAddress = address;
				MongoClient.connect(url, {
						useNewUrlParser: true,
						useUnifiedTopology: true
					}, async function (err, client) {
						const db = client.db("fotope");
						const obj =  {
							fpId,
							cropName,
							produceAddress,
							retailerId,
							retailer_address,
							qty,
							dispatch_timestamp,
							newBarcode
						}
				await db.collection('fp_unsent').updateOne({"produceAddress":produceAddress},{ $set: { "cropQty" : qtyRemaining } }).then(() => {
					console.log("changes to fp_old success")
				});

				await db.collection('fp_old').insertOne(obj).then(() => {
					console.log("changes to fp_old success")
				});

				await db.collection('retailer_unreceived').insertOne(obj).then(() => {
					console.log("insert in retailer_unrecieved")
				});


				assert.equal(null, err);
				client.close();
				res.send("dispatched to retailer");
				});
				
			}
			else {
				res.send("error");
			}

				//2. MONGODB : TRANSFER FROM fp_unsent TO fp_old

				//3. MONGODB : CREATE A COPY OF ABOVE IN retailer_unreceived */
		}
		else if(qtyRemaining == 0) {
			//DELETE FROMM fp_unsent
			const addRetailer = await produce.methods.addRetailer(retailerId, retailer_address, qtyRemaining, dispatch_timestamp, newBarcode);
			const functionAbi = addRetailer.encodeABI();
			let estimatedGas;
			let nonce;
			var _nonce = await web3.eth.getTransactionCount(account);
			//console.log("Getting gas estimate");
			var gasAmount = await addRetailer.estimateGas({
				from: account
			});
			estimatedGas = gasAmount.toString(16);
			// construct the Tx data
			const rawTx = {
				//gasPrice: '0x09184e72a000',
				gasLimit: web3.utils.toHex(5000000),
				to: address,
				from: account,
				data: functionAbi,
				nonce: _nonce
			};

			//sign Tx
			var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
			var ans = await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);

			if (ans) {
			const produceAddress = address;
			//ADD TO fp_old
				MongoClient.connect(url, {
						useNewUrlParser: true,
						useUnifiedTopology: true
					}, async function (err, client) {
						const db = client.db("fotope");
						const obj =  {
							fpId,
							cropName,
							produceAddress,
							retailerId,
							retailer_address,
							qty,
							dispatch_timestamp,
							newBarcode
						}
				await db.collection('fp_old').insertOne(
					obj
				);

				await db.collection('fp_unsent').deleteOne({
					"produceAddress": address
				});

				await db.collection('retailer_unreceived').insertOne(obj);

				assert.equal('null', err);
				client.close();
				});
				res.send("dispatch success");
			}
			else{
				res.send("Could not dispatch");
			}
		}
		else {
			res.send("Invalid qty");
		}
		} catch (err) {
			res.send(err);
		}
});

//LST OF UNRECEIVED PRODUCES AT RETAILER SIDE
app.get("/retUnreceivedProduces/:retId", function (req,res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('retailer_unreceived').find({"retailerId":req.params.retId}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.send("error");
	}
});

//RETAILER VIEWS OLD PRODUCES
app.get("/retailerOldProduces/:retId", async function(req, res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('retailer_old').find({"retailerId":req.params.retId}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.json({err});
	}
});


//RETAILER RECEIVES
app.post("/produces/retailerReceives/:address", async function(req, res){
	//1. CALL receiverTimestamp() : UPDATE receiving_timestamp. FETCH ARRAY OF STRUCTS AND GET INDEX OF CORRECT RETAILER
	const address = req.params.address;
	let retailerId = req.body.retailerId;
	let timeStamp = req.body.timeStamp;
	console.log("got val");
	try {
		const produce = new web3.eth.Contract(
			JSON.parse(Produce.interface),
			address);
			const retailerReceives = await produce.methods.receiverTimestamp(retailerId, timeStamp);
			console.log("tra com");
			const functionAbi = retailerReceives.encodeABI();
			let estimatedGas;
			let nonce;
			var _nonce = await web3.eth.getTransactionCount(account);
			//console.log("Getting gas estimate");
			var gasAmount = await retailerReceives.estimateGas({
				from: account
			});
			estimatedGas = gasAmount.toString(16);
			// construct the Tx data
			const rawTx = {
				//gasPrice: '0x09184e72a000',
				gasLimit: web3.utils.toHex(5000000),
				to: address,
				from: account,
				data: functionAbi,
				nonce: _nonce
			};

			//sign Tx
			var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
			var ans = await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);
			if (ans) {
				MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
				const db = client.db("fotope");

				const cursor=await db.collection('retailer_unreceived').findOne({
				 produceAddress: address
				});
				console.log(cursor);
				let cropName=cursor.cropName;
				let fpId=cursor.fpId;
				let retailerId=cursor.retailerId;
				let retailer_address=cursor.retailer_address;
				let cropQty=cursor.qty;
				let produceAddress=cursor.produceAddress;
				let dispatch_timestamp=cursor.dispatch_timestamp;
				let barcode=cursor.newBarcode;
				var ob={cropName,fpId,retailerId,retailer_address,cropQty,produceAddress,dispatch_timestamp,barcode};

				await db.collection('retailer_old').insertOne(
					ob
				);

				await db.collection('retailer_unreceived').deleteOne({
					"produceAddress": address
				});

				assert.equal('null', err);
				client.close();
				});
				res.send("Retailer received success");
			}

			//ERROR
			else {
				res.send("Error");
			}
		}
		catch(err) {
			console.log(err);
			res.json({err});
		}

	//2. MONGODB : TRANSFER TO retailer_old
});

//GOV VIEWS UNVERIFIED PRODUCES
app.get("/allUnverifiedProduces", async function(req, res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('gov').find({"verificationStatus":"unverified"}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.json({err});
	}
});


//GOV VIEWS ALL PRODUCES
app.get("/allVerifiedProduces", async function(req, res){
	try{
		lst=[];
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
		const db = client.db("fotope");
		cursor= await db.collection('gov').find({"verificationStatus":"verified"}).forEach(function (doc){
			lst.push(doc)
		});
		console.log(lst);

	  	assert.equal(null, err);
	  	client.close();
	  	res.json({lst});
		});
	}
	catch(err){
		res.json({err});
	}
});

//GOV ID
app.post('/setSoilType/:address', async function (req,res) {
	const address = req.params.address;
	let govId = req.body.govId;
	let fertilizer_type = req.body.fertilizer_type;
	console.log("got val");
	try {
		const produce = new web3.eth.Contract(
			JSON.parse(Produce.interface),
			address);
			const retailerReceives = await produce.methods.setFertilizerType(govId, fertilizer_type);
			const functionAbi = retailerReceives.encodeABI();
			let estimatedGas;
			let nonce;
			var _nonce = await web3.eth.getTransactionCount(account);
			//console.log("Getting gas estimate");
			var gasAmount = await retailerReceives.estimateGas({
				from: account
			});
			estimatedGas = gasAmount.toString(16);
			// construct the Tx data
			const rawTx = {
				//gasPrice: '0x09184e72a000',
				gasLimit: web3.utils.toHex(5000000),
				to: address,
				from: account,
				data: functionAbi,
				nonce: _nonce
			};

			//sign Tx
			var RLPencodedTx = await web3.eth.accounts.signTransaction(rawTx, private_key)
			var ans = await web3.eth.sendSignedTransaction(RLPencodedTx['rawTransaction']);
			if (ans) {
				//CHANGE STATUS TO VERIFIED
				MongoClient.connect(url, {
						useNewUrlParser: true,
						useUnifiedTopology: true
					}, async function (err, client) {
						const db = client.db("fotope");
				await db.collection('gov').updateOne({"produceAddress":address},{ $set: { "verificationStatus" : "verified" } }).then(() => {
					console.log("changes to gov success")
				});


				assert.equal(null, err);
				client.close();
				res.send("success");
				});
				res.send("success");
			}
			else {
				res.send("failure");
			}
		}
		catch (err) {
			res.json({err});
		}
});

app.get("/produces/getAllData/:address", async function(req, res){
	//1. CALL showAllDetails1, showAllDetails2, showAllDetails3
	try {
				const produce = new web3.eth.Contract(
					JSON.parse(Produce.interface),
					req.params.address
				);
				const showAllDetails1 = await produce.methods.showAllDetails1().call();
				const showAllDetails2 = await produce.methods.showAllDetails2().call();
				const showAllDetails3 = await produce.methods.showAllDetails3().call();
				let details = {
					first : showAllDetails1,
					second : showAllDetails2,
					third : showAllDetails3
				}
				console.log(details);
				res.json({details});
			} catch (err) {

				res.json({err});
			}

});


app.listen(process.env.PORT,process.env.IP, function(){
   console.log("Server started");
});
