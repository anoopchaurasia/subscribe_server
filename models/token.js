var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var token = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    token: {
        type: String
    },
    created_at: Date
});


var tokens = mongoose.model('token', token);
module.exports = tokens;
