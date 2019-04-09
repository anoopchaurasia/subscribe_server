'use strict'
const express = require('express');
const fcmToken = require('../models/fcmToken');
const token_model = require('../models/token');
const DeviceInfo = require('../models/deviceInfo');
const router = express.Router();


/* 
This Api for storing FCM Token Into database for firebase notification.
*/
router.post('/savefcmToken', async (req, res) => {
    let token = req.token;
    let tokenInfo = { "user_id": token.user_id, "fcm_token": req.body.fcmToken };
    await fcmToken.findOneAndUpdate({ "user_id": token.user_id }, tokenInfo, { upsert: true }).catch(err => {
        console.log(err);
    });
    res.json({
        message: "success"
    });
});


/*
This Api for storing Device Inforamtion into Database.
*/
router.post('/saveDeviceInfo', async (req, res) => {
    let deviceData = req.body.data;
    deviceData['user_id']=req.token.user_id;
    await DeviceInfo.findOneAndUpdate({ "user_id": req.token.user_id }, deviceData, { upsert: true }).catch(err => {
        console.log(err);
    });
    res.json({
        message: "success"
    });
});


/*
This api for Logout/deleting whole data for particular User.
*/
router.post('/disconnectGdprAccount', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        console.log(doc)
        if (doc) {
            // let newvalues = {
            //     $set: {
            //         "is_logout": true
            //     }
            // };
            // let resp = await userDetails.findOneAndUpdate({ "_id": doc.user_id  }, newvalues, { upsert: true }).catch(err => { console.log(err); });
            // console.log(resp)
            res.json({
                message: "success"
            });
        }
    } catch (ex) {
    }
});



module.exports = router;



