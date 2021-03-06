
// Global objects

var mongoose = require('mongoose');
var uuid = require('uuid/v4'); // Unique ID RFC4122 generator
var nodeOp = require('../../models/vicinityManager').node;
var userAccountOp = require('../../models/vicinityManager').userAccount;
var logger = require("../../middlewares/logger");
var commServer = require('../../services/commServer/request');
var audits = require('../../services/audit/audit');

/*
Creates a node for an organisation
Creates relevant users and groups in commServer
Receives request from client
*/
function postOne(raw, company_id, cid, userMail, userId, callback){
  var db = new nodeOp();
  db.name = raw.name;
  db.eventUri = raw.eventUri;
  db.agent = raw.agent;
  db.type = raw.type;
  db.status = "active";
  db.cid = {"id": company_id, "extid": cid};
  db.adid = uuid();

  db.save()
  .then(function(data){
    var payload = { username : data.adid, name: data.name, password: raw.pass
      // properties: { property: [ {'@key':'agent', '@value': data.agent}, {'@key':'uri', '@value': data.eventUri} ]}
    };
    var groupData = { name: data.adid, description: data.name };
    commServer.callCommServer(payload, 'users', 'POST')
    .then( function(response){ return commServer.callCommServer({}, 'users/' + data.adid + '/groups/' + cid + '_agents', 'POST'); })  //Add node to company group in commServer
    // .then( function(response){ return commServer.callCommServer(groupData, 'groups/', 'POST'); }) // Create node group in commServer
    .then( function(response){ return userAccountOp.update( { _id: company_id}, {$push: {hasNodes: {"id": data._id, "extid": data.adid}}}); }) // Add node to company in MONGO
    .then( function(response){
      return audits.create(
        { kind: 'user', item: userId, extid: userMail },
        { kind: 'userAccount', item: company_id, extid: cid },
        { kind: 'node', item: data._id, extid: data.adid },
        21, null);
      })
    .then(function(response){
      logger.audit({user: userMail, action: 'createNode', item: data._id });
      callback(false, "Node created"); })
    .catch(function(err){
      logger.warn({user: userMail, action: 'createNode', message: err});
      callback(true, err);
    });
  })
  .catch(function(err){
    logger.error({user: userMail, action: 'createNode', message: err});
    callback(true, err);
  });
}

// Export Functions

module.exports.postOne = postOne;
