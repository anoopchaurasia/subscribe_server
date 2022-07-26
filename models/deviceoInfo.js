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
    deviceIpAddress:{
        type:Object
    },
    timeZoneOffset:{
        type:String
    },
    userUniqueId:{
        type:String
    },
    deviceModel:{
        type:String
    },
    devicePhone:{
        type:Number
    },
    uniqueId:{
        type:String
    },
    identifierId:{
        type:String
    },
    deleted_at:{
        type:Date
    },
    created_at: Date,
    appsFlyerUID: String
});

module.exports = mongoose.model('DeviceoInfo', DeviceInfoSchema);