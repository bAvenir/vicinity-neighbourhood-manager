
// Global objects

var mongoose = require('mongoose');
var logger = require("../../middlewares/logger");

var sNodePost = require('../../services/nodes/post');

// Functions

/*
Creates a node for an organisation
Creates relevant users and groups in commServer
Receives request from client
*/
function postOne(req, res, next) {
  var data = req.body;

  var company_id = mongoose.Types.ObjectId(data.decoded_token.orgid);
  var cid = data.decoded_token.cid;
  var userMail = data.decoded_token.sub !== 'undefined' ? data.decoded_token.sub : "unknown";
  var userId = data.decoded_token.uid !== 'undefined' ? data.decoded_token.uid : "unknown";
  delete data.decoded_token;
  delete data.token;

  sNodePost.postOne(data, company_id, cid, userMail, userId, function(err, response){
    res.json({error: err, message: response});
  });
}

// Export Functions

module.exports.postOne = postOne;
