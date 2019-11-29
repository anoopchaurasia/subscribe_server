var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var Domain = new Schema({
    company: String,
    domain_name: {
        type: String,
        unique : true, 
        required : true, 
        "default":"add domain",
        dropDups: true
    },
    disabled: Boolean
});


module.exports = mongoose.model('Domain', Domain);
