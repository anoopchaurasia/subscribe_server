var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var token = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    token: {
        type: String
    },
    refresh_token: String,
    last_used_at: Date,
    ipaddress: String,
    created_at: String,
});


var tokens = mongoose.model('tokeno', token);
module.exports = tokens;
