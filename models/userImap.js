var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserSchema = new Schema({
    email: {
        type: String,
    },
    password:{
        type: String
    },
    name:{
        type:String
    } ,
    last_name:{
        type:String
    },
    dob:{
        type:String
    },
    mobile_no:{
        type:String
    }
});


module.exports = mongoose.model('UserImap', UserSchema);

