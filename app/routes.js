// app/routes.js

var invoke_cp = require('./invoke-coinpool.js');
var query_cp = require('./query-coinpool.js');

module.exports = function(app) {
	// =====================================
	// Coinpool Query ==================
	// =====================================
	app.post('/coinpool_query', function(req, res) {
		console.log("req.body:", req.body);
		if (req.body.query_type == "query"){
			query_cp(req.body.func_name, req.body.func_args, false, function(query_res){
				res.end(query_res);
			});
		}
		else if (req.body.query_type == "broadcast"){
			query_cp(req.body.func_name, req.body.func_args, true, function(query_res){
				res.end(query_res);
			}, true);
		}
		else{
			invoke_cp(req.body.func_name, req.body.func_args, function(query_res){
				res.end(query_res);
			});
		}
	});
};
