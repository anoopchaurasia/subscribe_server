var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UnlistedProviderSchema = new Schema({
    device_id:  {
        type: Schema.Types.ObjectId,
        ref: 'DeviceInfo',
        index: true
    },
    email_id: {
        type: String
    },
    created_at: Date
});

module.exports = mongoose.model('UnlistedProvider', UnlistedProviderSchema);