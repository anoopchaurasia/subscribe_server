var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var deviceInfo = new Schema({
    user_id: {
        type: String
    },
   
    created_at: Date
});


var deviceInfos = mongoose.model('deviceInfo', deviceInfo);
module.exports = deviceInfos;
