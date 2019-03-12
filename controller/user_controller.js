let express = require('express');
let fcmToken = require('../models/fcmToken');
let token_model = require('../models/token');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let userDetails = require('../models/userDetail');
let deviceInfo = require('../models/deviceInfo');
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

router.post('/saveDeviceInfo', async (req, res) => {
    try {

        let auth_id = req.body.authID;
        console.log(req.body.data)
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let deviceData = req.body.data;
            deviceData['user_id']=doc.user_id;
            let tokenDoc = await deviceInfo.findOneAndUpdate({ "user_id": doc.user_id }, deviceData, { upsert: true }).catch(err => {
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

router.post('/disconnectGdprAccount', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        console.log(doc)
        if (doc) {
            let fcm = await fcmToken.remove({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            console.log(fcm);
            let auth = await auth_token.remove({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            console.log(auth);
            let emaildata = await email.remove({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            console.log(emaildata);
            let tok = await token_model.remove({ "token": auth_id }).catch(err => {
                console.log(err);
            });
            console.log(tok);
            let user = await userDetails.remove({ "_id": doc.user_id }).catch(err => {
                console.log(err);
            })
            console.log(user);
            res.json({
                message: "success"
            });
        }
    } catch (ex) {
    }
});



module.exports = router



