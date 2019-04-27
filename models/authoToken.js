var mongoose = require('mongoose');
let TokenHandler = require("../helper/TokenHandler");
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
    }
});

AuthToken.virtual('isExpired').get(function() {  
    return Date.now() >= new Date(this.expiry_date).getTime();
});


AuthToken.virtual('fresh_token').get(async function() {  
    if(this.isExpired) {
        await TokenHandler.refreshToken(this);
    }
    return this.access_token;
});

module.exports = mongoose.model('AuthoToken', AuthToken);

