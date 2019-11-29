var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var fcmToken = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    device_id: {
        type: Schema.Types.ObjectId,
        ref: 'DeviceoInfo',
        index: true
    },
    fcm_token: {
        type: String
    },
    created_at: Date
});


var fcmTokens = mongoose.model('fcmoToken', fcmToken);
module.exports = fcmTokens;
