var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var AuthToken = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
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
    },
    app_version: {
        type: String
    },
    is_valid:{
        type:Boolean
    }
});


module.exports = mongoose.model('AuthoToken', AuthToken);

