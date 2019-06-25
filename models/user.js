var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserSchema = new Schema({
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
    },
    given_name:{
        type:String
    },
    family_name:{
        type:String
    },
    gender:{
        type:String
    },
    birth_date:{
        type:Date
    },
    state: {
        type: String
    },
    email_client: {
        type: String,
    }

});


module.exports = mongoose.model('User', UserSchema);

