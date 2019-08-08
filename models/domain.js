var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var Domain = new Schema({
    domain_name: {
        type: String
    }
});


module.exports = mongoose.model('Domain', Domain);
