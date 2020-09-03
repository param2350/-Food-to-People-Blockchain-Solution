const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
//const url = 'mongodb+srv://onebond:onebond@cluster0-uqs2c.mongodb.net/test?retryWrites=true';
const url = "mongodb+srv://onebond:onebond@cluster0-lv3ox.mongodb.net/test?retryWrites=true&w=majority";
/*
// Use connect method to connect to the Server
MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
	const db = client.db("fotope");
	await db.collection('farmer_unsent').insertOne({	
		farmerId: "farm01"
		 cropName: "wheat",
		 cropQty: 100,
		 address: '0xuhfuiweuirty'
		 fp: "fp90"
	})
	.then(function(result) {
	  // process result
	  console.log(result);
	})
  assert.equal(null, err);
  client.close();
});	

MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
	const db = client.db("fotope");
	await db.collection('farmer_unsent').update(
			{ "farmer012.produces" },
  			 { $push: { "produces":{cropName: "carrot", cropQty: 105, address: '0xuiywer864786gt'} } }
	)
  assert.equal(null, err);
  client.close();
});
*/
let cropName,cropQty,address;
MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, async function(err, client) {
	const db = client.db("fotope");
	lst=[]

	//=========================================================================
	const cursor= await db.collection('users').findOne({"usertype": "farmer", "username":"farm12", "password":"1111"});
	assert.equal(null, err);
  client.close();
	if(cursor==null)
		console.log("Invalid");
	else
		console.log(cursor);

	// cropName=cursor.cropName;
	// cropQty=cursor.cropQty;
	// address=cursor.address;
	// var ob={cropName,cropQty,address};
	//console.log(cursor);

	//INSERT IN OLD
	/*await db.collection('farmer_all_old').insertOne(ob)
	.then(function(result) {
	  // process result
	  console.log(result.ops[0]);
	});
	console.log("dele");
	//DEL
	await db.collection('farmer_unsent').deleteOne({"address":address})
	.then(function(result) {
	  // process result
	  console.log(result);
	});*/
  

//==========================================================
  
});
