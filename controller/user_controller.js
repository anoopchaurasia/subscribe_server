'use strict'
const express = require('express');
const fcmToken = require('../models/fcmToken');
const token_model = require('../models/token');
const auth_token = require('../models/authToken');
const email = require('../models/email');
const userDetails = require('../models/userDetail');
const deviceInfo = require('../models/deviceInfo');
const router = express.Router();

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
            res.json({
                message: "success"
            });
        }
    } catch (ex) {
    }
});



module.exports = router



