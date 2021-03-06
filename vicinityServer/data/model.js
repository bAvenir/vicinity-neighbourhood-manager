var mongoose = require('mongoose');

var ObjectId = mongoose.Schema.Types.ObjectId;


var gatewayobject = {
    device_id: ObjectId,
    device_rid: String,
    company_id: ObjectId,
    type: String,
    info: {
      id_tag: String,
      id_value: String
    },
    data_sources: [{
      name: String,
      rid: String,
      controllable: String,
      value: String,
      timestamp: Number
    }]
};

module.exports.gatewayobject = mongoose.model('gatewayobject', gatewayobject);
