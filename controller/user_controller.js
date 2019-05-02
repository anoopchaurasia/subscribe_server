'use strict'
const express = require('express');
const fcmToken = require('../models/fcmoToken');
const token_model = require('../models/tokeno');
const DeviceInfo = require('../models/deviceoInfo');
const router = express.Router();


/* 
This Api for storing FCM Token Into database for firebase notification.
*/
router.post('/savefcmToken', async (req, res) => {
    let token = req.token;
    let tokenInfo = { "user_id": token.user_id, "fcm_token": req.body.fcmToken };
    await fcmToken.findOneAndUpdate({ "user_id": token.user_id }, tokenInfo, { upsert: true }).catch(err => {
        console.error(err.message, err.stack);
    });
    res.json({
        message: "success"
    });
});


/*
This Api for storing Device Inforamtion into Database.
*/
router.post('/saveDeviceInfo', async (req, res) => {
    // console.log(req.header('x-forwarded-for') || req.connection.remoteAddress)
    let deviceData = req.body.data;
    deviceData['user_id']=req.token.user_id;
    console.log(deviceData);
    deviceData['deviceIpAddress'] = {"ip":req.header('x-forwarded-for') || req.connection.remoteAddress};
    let device = await DeviceInfo.findOneAndUpdate({ "user_id": req.token.user_id }, deviceData, { upsert: true }).catch(err => {
        console.error(err.message, err.stack);
    });
    console.log(device)
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
            console.error(err.message, err.stack);
        });
        console.log(doc)
        if (doc) {
            res.json({
                message: "success"
            });
        }else{
            res.status(400).json({
                message: "fail"
            });
        }
    } catch (ex) {
        console.error(ex.message, ex.stack);
    }
});



module.exports = router;



