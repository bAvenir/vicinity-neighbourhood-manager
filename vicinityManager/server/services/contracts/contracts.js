// Global objects and variables

var mongoose = require('mongoose');
var logger = require("../../middlewares/logger");
var audits = require('../../services/audit/audit');
var contractOp = require('../../models/vicinityManager').contract;
var userOp = require('../../models/vicinityManager').user;
var itemOp = require('../../models/vicinityManager').item;
var notifHelper = require('../../services/notifications/notificationsHelper');
var sharingRules = require('../../services/sharingRules');
var commServer = require('../../services/commServer/request');
var uuid = require('uuid/v4'); // Unique ID RFC4122 generator

//Functions

/**
Accept a contract request
* @return {Callback}
*/
function accepting(id, callback){
  // TODO enable option to accept contract by iotOwner
  var updItem = {};
  var query = { $set: {"serviceProvider.termsAndConditions": true, status: 'accepted'} };
  contractOp.findOneAndUpdate( { "_id": id}, query, {new: true})
  .then(function(response){
    updItem = response.toObject(); // Get rid of metadata
    return sharingRules.createContract(updItem.ctid, 'Contract: ' + updItem.type);
  })
  .then(function(response){
    var items = [];
    getOnlyOid(items, updItem.serviceProvider.items);
    getOnlyOid(items, updItem.iotOwner.items);
    return sharingRules.addItemsToContract(updItem, items);
  })
  .then(function(response){
    return notifHelper.createNotification(
      { kind: 'user', item: updItem.serviceProvider.uid.id, extid: updItem.serviceProvider.uid.extid },
      { kind: 'user', item: updItem.iotOwner.uid.id, extid: updItem.iotOwner.uid.extid },
      { kind: 'contract', item: updItem._id, extid: updItem.ctid },
      'info', 24, null);
  })
  .then(function(response){
    return audits.create(
      { kind: 'user', item: updItem.serviceProvider.uid.id, extid: updItem.serviceProvider.uid.extid },
      { kind: 'user', item: updItem.iotOwner.uid.id, extid: updItem.iotOwner.uid.extid },
      { kind: 'contract', item: updItem._id, extid: updItem.ctid },
      51, null);
  })
  .then(function(response){
    callback(updItem, false);
  })
  .catch(function(error){
    logger.debug(error);
    callback(error, true);
  });
}

/**
Create a contract request
* @return {Callback}
*/
function creating(data, callback){
  // TODO service provider can post a contract
  var ct_id, ctid;
  var ct = new contractOp();
  var idsService = [];
  var idsDevice = [];
  // ct.ctid = data.ctid === undefined ? uuid() : data.ctid;
  ct.ctid = uuid();
  ct.serviceProvider = { cid: data.cidService, uid: data.uidService, termsAndConditions: false, items: data.oidService };
  ct.iotOwner = { cid: data.cidDevice, uid: data.uidDevice, termsAndConditions: true, items: data.oidDevices };
  ct.readWrite = data.readWrite;
  ct.legalDescription = 'lorem ipsum';
  ct.type = 'serviceRequest';
  ct.save(
    function(error, response){
      if(error){
        res.json({error: true, message: error});
      } else {
        ct_id = response._id;
        ctid = response.ctid;
        var cidService = data.cidService.extid;
        var cidDevice = data.cidDevice.extid;
        var ctidService = {id: ct_id, extid: response.ctid, contractingParty: data.cidDevice.id, contractingUser: data.uidDevice.id, approved: true };
        var ctidDevice = {id: ct_id, extid: response.ctid, contractingParty: data.cidService.id, contractingUser: data.uidService.id, approved: true };
        var uidService = data.uidService.id;
        getOnlyId(idsService, data.oidService);
        var uidDevice = data.uidDevice.id;
        getOnlyId(idsDevice, data.oidDevices);
        userOp.update({_id: uidDevice}, { $push: {hasContracts: ctidDevice} })
        .then(function(response){
            return itemOp.update({_id: {$in: idsDevice }}, { $push: {hasContracts: ctidDevice} }, { multi: true });
        })
        .then(function(response){
          return userOp.update({_id: uidService}, { $push: {hasContracts: ctidService} });
        })
        .then(function(response){
          return itemOp.update({_id: {$in: idsService }}, { $push: {hasContracts: ctidService} }, { multi: true });
        })
        .then(function(response){
          return notifHelper.createNotification(
            { kind: 'user', item: data.uidDevice.id, extid: data.uidDevice.extid },
            { kind: 'user', item: data.uidService.id, extid: data.uidService.extid },
            { kind: 'contract', item: ct_id, extid: ctid },
            'info', 21, null);
        })
        .then(function(response){
          return audits.create(
            { kind: 'user', item: data.uidDevice.id, extid: data.uidDevice.extid },
            { kind: 'user', item: data.uidService.id, extid: data.uidService.extid },
            { kind: 'contract', item: ct_id, extid: ctid },
            53, null);
        })
        .then(function(response){
          callback({}, false);
        })
        .catch(function(error){
          logger.debug(error);
          callback(error, true);
        });
      }
    }
  );
}

/**
Remove a contract
* @return {Callback}
*/
function removing(id, callback){
  var finalResp;
  var data = {};
  var idsDevice = [];
  var idsService = [];
  var cidService = "";
  var cidDevice = "";
  var ctid = {};
  var uidService = "";
  var uidDevice = "";

  var query = {
    serviceProvider:{},
    iotOwner:{},
    legalDescription: "",
    status: 'deleted'
    };

  contractOp.findOne({_id:id})
  .then(function(response){
    data = response.toObject(); // Get rid of metadata
    return contractOp.update({_id:id}, {$set: query});
  })
  .then(function(response){
    return sharingRules.cancelContract(data.ctid);
  })
  .then(function(response){
    finalResp = response;
    cidService = data.serviceProvider.cid.extid;
    cidDevice = data.iotOwner.cid.extid;
    ctid = {id: data._id, extid: data.ctid};
    uidService = data.serviceProvider.uid.id;
    getOnlyId(idsService, data.serviceProvider.items);
    uidDevice = data.iotOwner.uid.id;
    getOnlyId(idsDevice, data.iotOwner.items);
    return userOp.update({_id: uidDevice}, { $pull: {hasContracts: ctid} });
  })
  .then(function(response){
    return itemOp.update({_id: {$in: idsDevice }}, { $pull: {hasContracts: ctid} }, { multi: true });
  })
  .then(function(response){
    return userOp.update({_id: uidService}, { $pull: {hasContracts: ctid} });
  })
  .then(function(response){
    return itemOp.update({_id: {$in: idsService }}, { $pull: {hasContracts: ctid} }, { multi: true });
  })
  .then(function(response){
    return notifHelper.createNotification(
      { kind: 'user', item: data.serviceProvider.uid.id, extid: data.serviceProvider.uid.extid },
      { kind: 'user', item: data.iotOwner.uid.id, extid: data.iotOwner.uid.extid },
      { kind: 'contract', item: ctid.id, extid: ctid.extid },
      'info', 23, null);
  })
  .then(function(response){
    return notifHelper.createNotification(
      { kind: 'user', item: data.iotOwner.uid.id, extid: data.iotOwner.uid.extid },
      { kind: 'user', item: data.serviceProvider.uid.id, extid: data.serviceProvider.uid.extid },
      { kind: 'contract', item: ctid.id, extid: ctid.extid },
      'info', 23, null);
  })
  .then(function(response){
    return audits.create(
      { kind: 'user', item: data.iotOwner.uid.id, extid: data.iotOwner.uid.extid },
      { kind: 'user', item: data.serviceProvider.uid.id, extid: data.serviceProvider.uid.extid },
      { kind: 'contract', item: ctid.id, extid: ctid.extid },
      52, null);
  })
  .then(function(response){
    callback(finalResp, false);
  })
  .catch(function(error){
    logger.debug('Delete contract error: ' + error);
    callback(error, true);
  });
}

/**
Modify contracts related with removed device
* @return {Callback}
*/
function removeDevice(item, otherParams, callback){
  var ctids = [];
  var mycid = item.cid.id._id;
  var friends = [];
  var notifs = [];
  if(item.accessLevel === 0){
    getOnlyId(ctids, item.hasContracts);
    // for(var j = 0; j < item.hasContracts.length; j++){
    //   notifs.push({mycid: mycid, othercid: item.hasContracts[j].contractingParty, thing: item.hasContracts[j].id, type: 22});
    // }
  } else {
    getOnlyId(friends, item.cid.id.knows);
    for(var i = 0; i < item.hasContracts.length; i++){
      if(friends.indexOf(item.hasContracts[i].contractingParty) === -1){
        ctids.push(item.hasContracts[i].id.toString());
        // notifs.push({mycid: mycid, othercid: item.hasContracts[i].contractingParty, thing: item.hasContracts[i].id, type: 22});
      }
    }
  }

  itemOp.update({_id: item._id}, {$pull: {hasContracts: {id: {$in: ctids}}}}, { multi: true })
  .then(function(){ return contractOp.update({_id: {$in: ctids}}, {$pull: {'iotOwner.items' : {id: item._id}}}, { multi: true }); })
  .then(function(){ return contractOp.update({_id: {$in: ctids}}, {$pull: {'serviceProvider.items' : {id: item._id}}}, { multi: true }); })
  .then(function(){
    for(var i = 0; i < item.hasContracts.length; i++){
      if(ctids.indexOf(item.hasContracts[i].id.toString()) !== -1){
        commServer.callCommServer({}, 'users/' + item.oid + '/groups/' + item.hasContracts[i].extid, 'DELETE');
      }
    }
    return true;
  })
  // .then(function(){
  //   for(item in notifs){
  //     createNotif(notifs[item].mycid, notifs[item].othercid, notifs[item].thing, notifs[item].type);
  //   }
  //   return true;
  // })
  .then(function(){
    contractValidity(ctids);
  })
  .then(function(){
    callback(item.oid, 'success');
  })
  .catch(function(err){
    callback(item.oid, err);
  });
}

// Private Functions --------------------------------

// function createNotif(mycid, othercid, thing, type){
//   var notification = new notificationOp();
//   notification.addressedTo.push(othercid, mycid);
//   notification.sentBy = mycid;
//   // notification.userId = "";
//   notification.ctId = thing;
//   notification.type = type;
//   notification.status = 'info';
//   return notification.save();
// }

function getOnlyOid(items, toAdd){
  for(var i = 0; i < toAdd.length; i++){
    items.push(toAdd[i].extid);
  }
}

function getOnlyId(array, toAdd){
  for(var i = 0; i < toAdd.length; i++){
    if(toAdd[i].hasOwnProperty("id")){
      array.push(toAdd[i].id.toString());
    } else {
      array.push(toAdd[i]._id.toString());
    }
  }
}

/*
If contract does not have items, delete it
*/
function contractValidity(ctids){
  contractOp.find({_id: {$in: ctids}}, {'serviceProvider.items':1, 'iotOwner.items':1})
  .then(function(response){
    for(var i = 0; i < ctids.length; i++){
      if(response[i].serviceProvider.items.length * response[i].iotOwner.items.length === 0){
        removing(ctids[i], function(resp,err){});
      }
    }
  })
  .catch(function(err){
    logger.debug('Error checking contract validity: ' + err);
  });
}

// modules exports

module.exports.removing = removing;
module.exports.removeDevice = removeDevice;
module.exports.creating = creating;
module.exports.accepting = accepting;
