var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var DeviceInfoSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
    ipaddress:{
        type:Object
    },
    macaddress:{
        type:Object
    },
    serialno:{
        type:String
    },
    timezone:{
        type:String
    },
    istablet:{
        type:Boolean
    },
    created_at: Date
});


module.exports = mongoose.model('DeviceoInfo', DeviceInfoSchema);