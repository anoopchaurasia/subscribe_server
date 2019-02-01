let express = require('express');
let fcmToken = require('../models/fcmToken');
let token_model = require('../models/token');
let router = express.Router();




router.post('/savefcmToken', async (req, res) => {
    try {
        console.log("save fcm token called...")
        console.log(req.body);
        let token = req.body.fcmToken;
        let auth_id = req.body.authID;
        token_model.findOne({ "token": auth_id },
            async function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    if (doc) {
                        console.log(doc);
                        let tokenInfo = {"user_id":doc.user_id,"fcm_token":token};
                        fcmToken.findOneAndUpdate({ "user_id": doc.user_id }, tokenInfo, { upsert: true }, function (err, tokenDoc) {
                            if (err) {
                                console.log(err);
                            } 
                            if(tokenDoc){
                                console.log(tokenDoc)
                                res.json({
                                    message: "success"
                                });
                            }
                        });
                    }
                }
            });

    } catch (ex) {

    }
});



module.exports = router



