'use strict';
/*
* Copyright 4intel Corp All Rights Reserved
*/

var hfc = require('fabric-client');
var path = require('path');
var util = require('util');
var urlrequest = require('request');
var date_utils = require('date-utils');
var cpconfig = require('../config/cpconfig');


module.exports = function(func_name, coinpool_args, fnRender) {
	var channel = {};
	var client = null;
	var tx_id = null;
	var targets = [];
	var wallet_path='';
	var invoke_result='';
	var err_msg='';
	wallet_path=path.join(__dirname, cpconfig.wallet_path);
	Promise.resolve().then(() => {
	    console.log("Create a client and set the wallet location");
	    client = new hfc();
	    return hfc.newDefaultKeyValueStore({ path: wallet_path });
	}).then((wallet) => {
	    console.log("Set wallet path, and associate user ", cpconfig.orgs[cpconfig.invoke_org_idx].admin_id, " with application");
	    client.setStateStore(wallet);
	    return client.getUserContext(cpconfig.orgs[cpconfig.invoke_org_idx].admin_id, true);
	}).then((user) => {
	    console.log("Check user is enrolled, and set a query URL in the network");
	    if (user !== undefined && user !== null && user.isEnrolled() !== false) {
		    channel = client.newChannel(cpconfig.channel_id);
		    var peerObj = client.newPeer(cpconfig.orgs[cpconfig.invoke_org_idx].peers[0].peer_url);
		    channel.addPeer(peerObj);
		    channel.addOrderer(client.newOrderer(cpconfig.orderers[0].orderer_url));
		    targets.push(peerObj);
	    }
	    else{
	        console.error("User not defined, or not enrolled - error");
  		    fnRender('{"ec":-2,"ref":"User not defined, or not enrolled."}');
	    }
	    return;
	}).then(() => {
	    try {
		    tx_id = client.newTransactionID();
		    console.log("Assigning transaction_id: ", tx_id._transaction_id);
	    }
	    catch(err) {
  		    fnRender('{"ec":-2,"ref":"Failed to create Transaction ID."}');
	    	return;
	    }
	    // createCar - requires 5 args, ex: args: ['CAR11', 'Honda', 'Accord', 'Black', 'Tom'],
	    // changeCarOwner - requires 2 args , ex: args: ['CAR10', 'Barry'],
	    // send proposal to endorser
	    var request = {
	        targets: targets,
	        chaincodeId: cpconfig.chaincode_id,
	        fcn: func_name,
	        args: coinpool_args,
	        chainId: cpconfig.channel_id,
	        txId: tx_id
	    };
	    console.log("################################# request #######################################");
	    console.log(request);
	    console.log("#################################################################################");
	    return channel.sendTransactionProposal(request);
	}).then((results) => {
		if (results === undefined || results === null){
			  fnRender('{"ec":-2,"ref":"Failed to send transaction proposal."}');
			  return;
		}
	    var proposalResponses = results[0];
	    var proposal = results[1];
	    var header = results[2];
	    let isProposalGood = false;
	    if (proposalResponses && proposalResponses[0].response &&
	        proposalResponses[0].response.status === 200) {
	        isProposalGood = true;
	        console.log('transaction proposal was good');
	    } else {
	        console.error('transaction proposal was bad');
			  fnRender('{"ec":-2,"ref":"transaction proposal was bad."}');
			  return;
	    }
	    if (isProposalGood) {
		    invoke_result = proposalResponses[0].response.payload;
	        console.log(util.format(
	            'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
	            proposalResponses[0].response.status, proposalResponses[0].response.message,
	            proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
			var json_res = JSON.parse(proposalResponses[0].response.payload);
			if(json_res.ec != 0){
				fnRender(proposalResponses[0].response.payload);
				return;
			}
	        var request = {
	            proposalResponses: proposalResponses,
	            proposal: proposal,
	            header: header
	        };
	        // set the transaction listener and set a timeout of 30sec
	        // if the transaction did not get committed within the timeout period,
	        // fail the test
	        var transactionID = tx_id.getTransactionID();
	        var eventPromises = [];
	        let eh = client.newEventHub();
	        eh.setPeerAddr(cpconfig.orgs[cpconfig.invoke_org_idx].peers[0].event_url);
	        eh.connect();
	
	        let txPromise = new Promise((resolve, reject) => {
	            let handle = setTimeout(() => {
	                eh.disconnect();
	                reject();
	            }, 30000);
	
	            eh.registerTxEvent(transactionID, (tx, code) => {
	                clearTimeout(handle);
	                eh.unregisterTxEvent(transactionID);
	                eh.disconnect();
	                if (code !== 'VALID') {
	                    console.error('The transaction was invalid, code = ' + code);
	                    reject();
	                } else {
	                    console.log('The transaction has been committed on peer ' + eh._ep._endpoint.addr);
	                    resolve();
	                }
	            });
	        });
	        eventPromises.push(txPromise);
	        var sendPromise = channel.sendTransaction(request);
	        return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
	            console.log(' event promise all complete and testing complete');
	            return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
	        }).catch((err) => {
	            console.error('Failed to send transaction and get notifications within the timeout period.');
	            fnRender('{"ec":-2,"ref":"Failed to send transaction and get notifications within the timeout period."}');
	            return 'Failed to send transaction and get notifications within the timeout period.';
	        });
	    } else {
	        console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
	        fnRender('{"ec":-2,"ref":"Failed to send Proposal or receive valid response. Response null or status is not 200. exiting..."}');
			 return 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
	    }
	}, (err) => {
		err_msg ='Failed to send proposal due to error: ' + err.stack ? err.stack : err;
	    console.error(err_msg);
	    fnRender(util.format('{"ec":-2,"ref":"%s"}', err_msg));
	    return err_msg;
	}).then((response) => {
	    if (response.status === 'SUCCESS') {
            if(func_name=='createTrans' || func_name=='attachTransTag' || func_name=='escrowTrans') {
                var dt = new Date();
                urlrequest('http://nsl.cau.ac.kr/coinpool/noti_update.php?ttm='+Math.round(dt.getTime()/1000));
                console.log('Successfully sent noti.'+func_name);
            }
	        console.log('Successfully sent transaction to the orderer.');
	        fnRender(invoke_result);
	        return tx_id.getTransactionID();
	    } else {
	    	err_msg = 'Failed to order the transaction. Error code: ' + response.status;
	    	console.error(err_msg);
	    	fnRender(util.format('{"ec":-2,"ref":"%s" }', err_msg));
	    	return err_msg;
	    }
	}, (err) => {
		err_msg = 'Failed to send transaction due to error: ' + err.stack ? err.stack : err;
		console.error(err_msg);
		fnRender(util.format('{"ec":-2,"ref":"%s" }', err_msg));
		return err_msg;
	});
}
