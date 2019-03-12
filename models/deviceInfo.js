var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var deviceInfo = new Schema({
    user_id: {
        type: String
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


var deviceInfos = mongoose.model('deviceInfo', deviceInfo);
module.exports = deviceInfos;
