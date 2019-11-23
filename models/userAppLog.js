var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userAppLogSchema = new Schema({
    email_id:{
        type: String
    },
    attribute:{
        type: Object
    },
    created_at:{
        type: Date
    },
    action_name:{
        type: String
    },
    action_page:{
        type: String
    },
    action_event:{
        type: String
    },
    api_name:{
        type: String
    }
});


var userapplog = mongoose.model('UserAppLog', userAppLogSchema);
module.exports = userapplog;
