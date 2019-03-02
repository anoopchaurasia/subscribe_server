var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var authToken = new Schema({
    user_id: {
        type: String,
        index: true
    },
    access_token: {
        type: String
    },
    refresh_token: {
        type: String
    },
    id_token: {
        type: String
    },
    expiry_date: {
        type: Date
    },
    scope: {
        type: String
    },
    token_type: {
        type: String
    },
    label_id: {
        type: String
    },
    created_at:{
        type:Date
    }
});


var tokendata = mongoose.model('authToken', authToken);
module.exports = tokendata;
