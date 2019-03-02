var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var token = new Schema({
    user_id: {
        type: String,
        index: true
    },
    token: {
        type: String
    },
    created_at: Date
});


var tokens = mongoose.model('token', token);
module.exports = tokens;
