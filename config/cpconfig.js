// config/database.js
module.exports = {
    'channel_id': 'cpchannel',
    'chaincode_id': 'coinpool',
    'wallet_path': '../chainpool-frontend-creds',
    'query_org_idx': 0,
    'invoke_org_idx': 0,
    'orderers': [
    	{
    		'orderer_name': 'orderer',
    		'admin_id': 'ordererAdmin',
    		'orderer_url': 'grpc://127.0.0.1:7050'
    	}
    ],
    'orgs': [
    	{
    		'org_name': 'org1',
    		'admin_id': 'peerorg1Admin',
    		'peers': [
    			{
    				'peer_name': 'peer0',
    				'peer_url': 'grpc://127.0.0.1:7051',
        			'event_url': 'grpc://127.0.0.1:7053'
    			},
    			{
    				'peer_name': 'peer1',
    				'peer_url': 'grpc://127.0.0.1:8051',
        			'event_url': 'grpc://127.0.0.1:8053'
    			}
    		]
    	},
    	{
    		'admin_id': 'peerorg2Admin',
    		'peers': [
    			{
    				'peer_name': 'peer0',
    				'peer_url': 'grpc://127.0.0.1:9051',
        			'event_url': 'grpc://127.0.0.1:9053'
    			},
    			{
    				'peer_name': 'peer1',
    				'peer_url': 'grpc://127.0.0.1:10051',
        			'event_url': 'grpc://127.0.0.1:10053'
    			}
    		]
    	}
    ]
};
