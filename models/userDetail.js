var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var userDetail = new Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    user_id: {
        type: String,
        index: true
    },
    image_url: {
        type: String
    }
});


var userdata = mongoose.model('userDetail', userDetail);
module.exports = userdata;
