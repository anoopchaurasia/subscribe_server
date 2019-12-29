'use strict'
const express = require('express');
const fcmToken = require('../models/fcmoToken');
const token_model = require('../models/tokeno');
const DeviceInfo = require('../models/deviceoInfo');
const emailDetailsModel = require('../models/emailDetails');
const AppVersionModel = require('../models/appVersion');
fm.include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;
const router = express.Router();
const Sentry = require('@sentry/node');
/* 
This Api for storing FCM Token Into database for firebase notification.
*/
router.post('/savefcmToken', async (req, res) => {   
    res.json({
        message: "success"
    });
});

/*
This Api for storing Device Inforamtion into Database.
*/
router.post('/saveDeviceInfo', async (req, res) => {
    let deviceData = req.body.data;
    let user = req.user;
    deviceData['user_id'] = req.user._id;
    deviceData['deviceIpAddress'] = { "ip": req.header('x-forwarded-for') || req.connection.remoteAddress };
    let uniqueLaunchDeviceId = req.body['uniqueLaunchDeviceId'];
    let checkUserDevice = await DeviceInfo.findOne({ "user_id": deviceData['user_id'] }).catch(err => {
        Sentry.captureException(err);
        console.error(err.message, err.stack, "27");
    });

    //user does not exisst
    if (!checkUserDevice) {
        // new user identification using unique device id
        if (uniqueLaunchDeviceId) {
            await DeviceInfo.findOneAndUpdate({ "userUniqueId": uniqueLaunchDeviceId }, deviceData, { upsert: true }).catch(err => {
                Sentry.captureException(err);
                console.error(err.message, err.stack, "271");
            });
            res.json({
                message: "success"
            });
        }else{
            await DeviceInfo.findOneAndUpdate({ "user_id": deviceData['user_id'] }, deviceData, { upsert: true }).catch(err => {
                Sentry.captureException(err);
                console.error(err.message, err.stack, "273");
            });
        }
    } else {
        await DeviceInfo.findOneAndUpdate({ "user_id": deviceData['user_id'] }, deviceData, { upsert: true }).catch(err => {
            Sentry.captureException(err);
            console.error(err.message, err.stack, "273");
        });
        if (uniqueLaunchDeviceId) {
            await DeviceInfo.findOneAndUpdate({ "userUniqueId": uniqueLaunchDeviceId }, { $set: { "deleted_at": new Date(),"user_id": deviceData['user_id']} }, { upsert: true }).catch(err => {
                Sentry.captureException(err);
                console.error(err.message, err.stack, "432");
            });
        }
        res.json({
            message: "success"
        });
    }
    let userDevice = await DeviceInfo.findOne({ "user_id": user._id }).catch(err => {
        console.error(err.message, err.stack, "27");
    });
    let tokenInfo = { "user_id": user._id,"device_id":userDevice._id };
    await fcmToken.findOneAndUpdate({ "device_id": userDevice._id }, tokenInfo, { upsert: true }).catch(err => {
        console.error(err.message, err.stack, "26");
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
        let versionData = await AppVersionModel.findOne().sort({ version_name: -1 }).limit(1).catch(err => {
            console.error(err.message, err.stack);
        });
        return res.json({
            message: "success",
            version: versionData.version_name
        });
    } catch (ex) {
        console.error(ex.message, ex.stack);
            return res.status(400).json({
                message: "fail"
            });
    }
});


/*
This api for Logout/deleting whole data for particular User.
*/
router.post('/disconnectGdprAccount', async (req, res) => {
    try {
        let user = req.user;
        console.time("delete"+user._id)

        let fcmtoken = await fcmToken.deleteMany({ user_id: user._id }).exec().catch(err => {
            console.error(err.message, err.stack, "delete2");
        });
        console.timeLog("delete"+user._id)
        console.log(fcmtoken)
        let emailDetails = await emailDetailsModel.deleteMany({ user_id: user._id }).exec().catch(err => {
            console.error(err.message, err.stack, "delete3");
        });
        console.log(emailDetails)
        console.timeLog("delete"+user._id)
        let token = await token_model.deleteMany({ user_id: user._id }).exec().catch(err => {
            console.error(err.message, err.stack, "28");
        });
        console.log(token)
        let device = await DeviceInfo.deleteMany({ user_id: user._id }).exec().catch(err => {
            console.error(err.message, err.stack, "delete6");
        });
        console.timeLog("delete"+user._id)
        console.log(device);
        BaseController.UserModel.deleteMe(user);
        console.timeLog("delete"+user._id)
        console.log(user)
        res.status(200).send({
            message: "success"
        });
        console.timeEnd("delete")
    } catch (ex) {
        res.status(401).send({
            message: "reject"
        });
        console.error(ex.message, ex.stack, "29");
    }
});


module.exports = router;



