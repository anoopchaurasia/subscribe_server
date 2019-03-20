let express = require('express');
let fcmToken = require('../models/fcmToken');
let token_model = require('../models/token');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let userDetails = require('../models/userDetail');
let deviceInfo = require('../models/deviceInfo');
let router = express.Router();

router.post('/savefcmToken', async (req, res) => {
    let token = req.token;
    let tokenInfo = { "user_id": token.user_id, "fcm_token": token };
    await fcmToken.findOneAndUpdate({ "user_id": token.user_id }, tokenInfo, { upsert: true }).catch(err => {
        console.log(err);
    });
    res.json({
        message: "success"
    });
});

router.post('/saveDeviceInfo', async (req, res) => {
    let deviceData = req.body.data;
    deviceData['user_id']=req.token.user_id;
    await deviceInfo.findOneAndUpdate({ "user_id": req.token.user_id }, deviceData, { upsert: true }).catch(err => {
        console.log(err);
    });
    res.json({
        message: "success"
    });
});

router.post('/disconnectGdprAccount', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        console.log(doc)
        if (doc) {
            // let fcm = await fcmToken.remove({ "user_id": doc.user_id }).catch(err => {
            //     console.log(err);
            // });
            // console.log(fcm);
            // let auth = await auth_token.remove({ "user_id": doc.user_id }).catch(err => {
            //     console.log(err);
            // });
            // console.log(auth);
            // let emaildata = await email.remove({ "user_id": doc.user_id }).catch(err => {
            //     console.log(err);
            // });
            // console.log(emaildata);
            // let devicedata = await deviceInfo.remove({"user_id":doc.user_id}).catch(err=>{
            //     console.log(err);
            // })
            // console.log(devicedata);
            // let tok = await token_model.remove({ "token": auth_id }).catch(err => {
            //     console.log(err);
            // });
            // console.log(tok);
            // let user = await userDetails.remove({ "_id": doc.user_id }).catch(err => {
            //     console.log(err);
            // })
            // console.log(user);
            res.json({
                message: "success"
            });
        }
    } catch (ex) {
    }
});



module.exports = router



