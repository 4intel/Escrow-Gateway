'use strict';
/*
* Copyright 4intel Corp All Rights Reserved
*/

var hfc = require('fabric-client');
var path = require('path');
var cpconfig = require('../config/cpconfig');
var util = require('util');

module.exports = function(func_name, coinpool_args, bBrodcast, fnRender) {
	var start_org=0;
	if (bBrodcast !== true){
		start_org=cpconfig.query_org_idx;
		if (func_name === 'getNonce' && coinpool_args.length >= 3 && coinpool_args[2] === 'invoke')
			start_org=cpconfig.invoke_org_idx;
	}
	return query_chaincode(func_name, coinpool_args, start_org, 0, bBrodcast, fnRender);
}

function query_chaincode(func_name, coinpool_args, org_num, peer_num, bBrodcast, fnRender) {
	var channel = {};
	var client = null;
	var wallet_path='';
	wallet_path=path.join(__dirname, cpconfig.wallet_path);
	Promise.resolve().then(() => {
	    console.log("Create a client and set the wallet location");
	    client = new hfc();
	    return hfc.newDefaultKeyValueStore({ path: wallet_path });
	}).then((wallet) => {
		console.log("Set wallet path, and associate user ", cpconfig.orgs[org_num].admin_id, " with application");
	    client.setStateStore(wallet);
	    return client.getUserContext(cpconfig.orgs[org_num].admin_id, true);
	}).then((user) => {
	    console.log("Check user is enrolled, and set a query URL in the network");
	    if (user !== undefined && user !== null && user.isEnrolled() !== false) {
		    channel = client.newChannel(cpconfig.channel_id);
		    channel.addPeer(client.newPeer(cpconfig.orgs[org_num].peers[peer_num].peer_url));
	    }
	    else {
	        console.error("User not defined, or not enrolled - error");
			  fnRender('{"ec":-2,"ref":"User not defined, or not enrolled."}');
	    }
	    return;
	}).then(() => {
	    try {
		    var transaction_id = client.newTransactionID();
		    console.log("Assigning transaction_id: ", transaction_id._transaction_id);
	    }
	    catch(err) {
			  fnRender('{"ec":-2,"ref":"Failed to create Transaction ID."}');
	    	return;
	    }
	
	    // queryCar - requires 1 argument, ex: args: ['CAR4'],
	    // queryAllCars - requires no arguments , ex: args: [''],
	    const request = {
	        chaincodeId: cpconfig.chaincode_id,
	        txId: transaction_id,
	        fcn: func_name,
	        args: coinpool_args
	    };
	    return channel.queryByChaincode(request);
	}).then((query_responses) => {
		var query_result='';
	    console.log("returned from query");
	    if (query_responses === undefined ){
	        console.log("No payloads were returned from query");
			  fnRender('{"ec":-2,"ref":"No payloads were returned from query."}');
	    }
	    else if (!query_responses.length) {
			  fnRender('{"ec":-2,"ref":"No payloads were returned from query."}');
	        console.log("No payloads were returned from query");
	    } else {
	        console.log("Query result count = ", query_responses.length)
		    if (query_responses[0] instanceof Error) {
				  //fnRender('{"ec":-2,"ref":query_responses[0]}');
		        console.error("error from query = ", query_responses[0]);
		    }
		    console.log("Response is ", query_responses[0].toString());
		    var query_result = query_responses[0].toString();
	    }
		if (bBrodcast !== true){
		    fnRender(query_result);
		}
		else if(org_num === cpconfig.orgs.length-1 && peer_num === cpconfig.orgs[org_num].peers.length-1 ){
		    fnRender(query_result);
		}
		else{
			if(peer_num < cpconfig.orgs[org_num].peers.length-1)
				return query_chaincode(func_name, coinpool_args, org_num, peer_num+1, bBrodcast, fnRender);
			else if(org_num < cpconfig.orgs.length)
				return query_chaincode(func_name, coinpool_args, org_num+1, 0, bBrodcast, fnRender);
		}
	}).catch((err) => {
		  fnRender(util.format('{"ec":-2,"ref":"%s"}', err));
	    console.error("Caught Error", err);
	});
}
