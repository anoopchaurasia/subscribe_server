var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var DeviceInfoSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'UserDetail',
        index: true
    },
    apiLevel: {
        type: String
    },
    appName: {
        type: String
    },
    brand: {
        type: String
    },
    deviceCountry: {
        type: String
    },
    deviceId: {
        type: String
    },
    deviceLocale: {
        type: String
    },
    deviceName: {
        type: String
    },
    firstInstallTime: {
        type: String
    },
    manufacturer: {
        type: String
    },
    created_at: Date
});


module.exports = mongoose.model('DeviceInfo', DeviceInfoSchema);