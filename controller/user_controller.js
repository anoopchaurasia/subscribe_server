'use strict'
const express = require('express');
const fcmToken = require('../models/fcmoToken');
const token_model = require('../models/tokeno');
const DeviceInfo = require('../models/deviceoInfo');
const AuthTokenModel = require('../models/authoToken');
const emailDetailsModel = require('../models/emailDetails');
const emailInformationModel = require('../models/emailInfo');
const AppVersionModel = require('../models/appVersion');
const userModel = require('../models/user');
const router = express.Router();


/* 
This Api for storing FCM Token Into database for firebase notification.
*/
router.post('/savefcmToken', async (req, res) => {
    let token = req.token;
    let tokenInfo = { "user_id": token.user_id, "fcm_token": req.body.fcmToken };
    await fcmToken.findOneAndUpdate({ "user_id": token.user_id }, tokenInfo, { upsert: true }).catch(err => {
        console.error(err.message, err.stack, "26");
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
    deviceData['user_id'] = req.token.user_id;
    deviceData['deviceIpAddress'] = { "ip": req.header('x-forwarded-for') || req.connection.remoteAddress };
    let device = await DeviceInfo.findOneAndUpdate({ "user_id": req.token.user_id }, deviceData, { upsert: true }).catch(err => {
        console.error(err.message, err.stack, "27");
    });
    res.json({
        message: "success"
    });
});

router.post('/saveAppVersion', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        if (doc) {
            let data = {
                "version_name": req.body.version_name,
                "created_at": new Date()
            };
            await AppVersionModel.findOneAndUpdate({ "version_name": req.body.version_name }, data, { upsert: true }).catch(err => {
                console.error(err.message, err.stack);
            });
            return res.json({
                message: "success"
            });
        }
        return res.status(400).json({
            message: "fail"
        });
    } catch (ex) {
        console.error(ex.message, ex.stack);
    }
});

router.get('/getAppVersion', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        if (doc) {
            let versionData = await AppVersionModel.findOne().sort({ version_name: -1 }).limit(1).catch(err => {
                console.error(err.message, err.stack);
            });
            return res.json({
                message: "success",
                version: versionData.version_name
            });
        }
        return res.status(400).json({
            message: "fail"
        });
    } catch (ex) {
        console.error(ex.message, ex.stack);
    }
});




/*
This api for Logout/deleting whole data for particular User.
*/
router.post('/disconnectGdprAccount', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.error(err.message, err.stack, "28");
        });
        let authoTokon = await AuthTokenModel.remove({ user_id: doc.user_id }).catch(err => {
            console.error(err.message, err.stack, "delete1");
        });
        console.log(authoTokon)
        let fcmtoken = await fcmToken.remove({ user_id: doc.user_id }).catch(err => {
            console.error(err.message, err.stack, "delete2");
        });
        console.log(fcmtoken)
        let emailDetails = await emailDetailsModel.remove({ user_id: doc.user_id }).catch(err => {
            console.error(err.message, err.stack, "delete3");
        });
        console.log(emailDetails)
        let emailInfo = await emailInformationModel.remove({ user_id: doc.user_id }).catch(err => {
            console.error(err.message, err.stack, "delete4");
        });
        console.log(emailInfo)
        let token = await token_model.remove({ "user_id": doc.user_id }).catch(err => {
            console.error(err.message, err.stack, "delete5");
        });
        console.log(token)
        let device = await DeviceInfo.remove({ user_id: doc.user_id }).catch(err => {
            console.error(err.message, err.stack, "delete6");
        });
        console.log(device)
        let user = await userModel.remove({ _id: doc.user_id }).catch(err => {
            console.error(err.message, err.stack, "delete6");
        });
        console.log(user)
        res.status(200).send({
            message: "success"
        });
    } catch (ex) {
        res.status(401).send({
            message: "reject"
        });
        console.error(ex.message, ex.stack, "29");
    }
});


module.exports = router;



