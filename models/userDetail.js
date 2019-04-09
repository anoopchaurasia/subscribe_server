var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserDetail = new Schema({
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
    // is_logout:{
    //     type:Boolean
    // }
});


// authToken.virtual('auth_token').get(async function() {  
    
// });



var userdata = mongoose.model('UserDetail', UserDetail);
module.exports = userdata;

