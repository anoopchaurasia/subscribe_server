var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserSchema = new Schema({
    email: {
        type: String,
    },
    password:{
        type: String
    }
});


module.exports = mongoose.model('UserImap', UserSchema);

