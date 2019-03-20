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
    }
});


// authToken.virtual('auth_token').get(async function() {  
    
// });



var userdata = mongoose.model('userDetail', userDetail);
module.exports = userdata;

