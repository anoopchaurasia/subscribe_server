var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var EmailTrackSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    last_msgId:{
        type:Number
    }
});

module.exports = mongoose.model('EmailTrack', EmailTrackSchema);