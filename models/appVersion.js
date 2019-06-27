var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var AppVersion = new Schema({
    version_name: {
        type: String
    },
    created_at: Date
});


module.exports = mongoose.model('AppVersion', AppVersion);
