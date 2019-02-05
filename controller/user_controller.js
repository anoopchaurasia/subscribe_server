let express = require('express');
let fcmToken = require('../models/fcmToken');
let token_model = require('../models/token');
let router = express.Router();

router.post('/savefcmToken', async (req, res) => {
    try {
        let token = req.body.fcmToken;
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = { "user_id": doc.user_id, "fcm_token": token };
            let tokenDoc = await fcmToken.findOneAndUpdate({ "user_id": doc.user_id }, tokenInfo, { upsert: true }).catch(err => {
                console.log(err);
            });
            if (tokenDoc) {
                res.json({
                    message: "success"
                });
            }
        }
    } catch (ex) {
    }
});

module.exports = router



