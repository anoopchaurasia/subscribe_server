var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var fcmToken = new Schema({
    user_id: {
        type: String
    },
    fcm_token: {
        type: String
    },
    created_at: Date
});


var fcmTokens = mongoose.model('fcmToken', fcmToken);
module.exports = fcmTokens;
