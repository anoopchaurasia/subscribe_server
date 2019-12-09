'use strict'
const express = require('express');
const router = express.Router();
const DeviceInfo = require('../models/deviceoInfo');
const userAppLog = require('../models/userAppLog');
const providerModel = require('../models/provider');
const unlistedProviderModel = require('../models/unlistedProvider');
const loginAnalyticModel = require('../models/loginAnalytic');
const uniqid = require('uniqid');
var legit = require('legit');
var Raven = require('raven');
const app = express();
const cookieParser = require('cookie-parser');

app.use(cookieParser());


const TWO_MONTH_TIME_IN_MILI = 4 * 30 * 24 * 60 * 60 * 1000;
fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;
fm.Include("com.anoop.email.Email");
let EmailValidate = com.anoop.email.Email;

//login or signup with the credentials and generate the token and return back to user
router.post('/loginWithImap', async (req, res) => {
    try {
        let profile = await saveProviderInfo(req.body.username.toLowerCase());
        let ipaddress = req.header('x-forwarded-for') || req.connection.remoteAddress;
        let response = await Controller.login(req.body.username.toLowerCase(), req.body.password, profile, ipaddress, 'web').catch(err => {
            console.error(err.message, err, "imap_connect_error", req.body.username);
            Raven.captureException(err, { tags: { email_domain: req.body.username.split("@")[1], pass_length: req.body.password.length } });
            let attribute = {
                "type": "error",
                "error_message": err.message,
                "message": "login_failed"
            };
            createLogForUser(req.body.username, "login", "login_page", "imap_login", attribute, "loginWithImap");
            if (err.message.includes("enabled for IMAP") || err.message.includes("IMAP is disabled") || err.message.includes("IMAP use")) {
                return res.status(403).json({
                    error: true,
                    status: 403,
                    data: err.message,
                    message: "IMAP is disabled."
                })
            } else if (err.message.includes("Invalid credentials")) {
                return res.status(401).json({
                    error: true,
                    status: 401,
                    data: err.message,
                    message: "Invalid Credentials."
                })
            } else if (err.message.includes("Timed out")) {
                return res.status(402).json({
                    error: true,
                    status: 402,
                    data: err.message,
                    message: "Invalid Credential."
                })
            } else if (err.message.includes("Application specific password")) {
                return res.status(404).json({
                    error: true,
                    status: 404,
                    data: err.message,
                    message: "Application Specific Password Required."
                })
            } else {

                return res.status(404).json({
                    error: true,
                    status: 404,
                    data: err.message,
                    message: "Invalid Credentials."
                })
            }
        });
        if (response) {
            return res.cookie("refreshToken", response.token.refreshToken).status(200).json({
                error: false,
                status: 200,
                data: response,
                provider: profile.provider
            })
        } else {
            return res.status(404).json({
                error: true
            });
        }
    } catch (error) {
        console.error(error.message, error.stack, 'loginWithImap')
    }
});

let createLogForUser = async (email_id, action_name, action_page, action_event, attribute, api_name) => {
    var userLog = new userAppLog({
        email_id,
        attribute,
        created_at: new Date(),
        action_name,
        action_page,
        action_event,
        api_name
    });
    await userLog.save().catch(err => {
        console.error(err.message, err.stack);
    });
}

router.post('/saveOnLaunchDeviceData', async (req, res) => {
    let deviceData = req.body.data;
    let userUniqueId = deviceData['serialno'] + uniqid() + uniqid() + uniqid() + uniqid();
    deviceData['user_id'] = null;
    deviceData['userUniqueId'] = userUniqueId;
    deviceData['deviceIpAddress'] = { "ip": req.header('x-forwarded-for') || req.connection.remoteAddress };
    await DeviceInfo.findOneAndUpdate({ "userUniqueId": userUniqueId }, { $set: deviceData }, { upsert: true }).catch(err => {
        console.error(err.message, err.stack, "27");
    });
    res.status(200).json({
        error: false,
        status: 200,
        message: "success",
        userUniqueId: userUniqueId
    });
});

router.post('/saveUnlistedProviderInfo', async (req, res) => {
    let email_id = req.body.email;
    let userUniqueId = req.body.uniqueLaunchDeviceId;
    let deviceData = await DeviceInfo.findOne({ "userUniqueId": userUniqueId }).catch(err => {
        console.error(err.message, err.stack, "27");
    });
    if (deviceData) {
        var unlistedProvider = new unlistedProviderModel({
            "email_id": email_id,
            "device_id": deviceData._id,
            "created_at": new Date()
        });
        await unlistedProvider.save().catch(err => {
            console.error(err.message, err.stack);
        });
        res.status(200).json({
            error: false,
            status: 200,
            message: "success"
        });
    } else {
        res.status(401).json({
            error: true,
            status: 401,
            message: "false"
        });
    }
});

router.post('/saveAnalyticData', async (req, res) => {
    let email_id = req.body.email;
    let userUniqueId = req.body.uniqueLaunchDeviceId;
    let deviceData = await DeviceInfo.findOne({ "userUniqueId": userUniqueId }).catch(err => {
        console.error(err.message, err.stack, "27");
    });
    if (deviceData) {
        var loginAnalytic = {
            "email_id": email_id,
            "device_id": deviceData._id,
            "created_at": new Date()
        };
        await loginAnalyticModel.findOneAndUpdate({ "email_id": email_id }, { $set: loginAnalytic }, { upsert: true }).catch(err => {
            console.error(err.message, err.stack);
        });
        res.status(200).json({
            error: false,
            status: 200,
            message: "success"
        });
    } else {
        res.status(401).json({
            error: true,
            status: 401,
            message: "false"
        });
    }
});

router.post('/saveAnalyticDataWithStep', async (req, res) => {
    let email_id = req.body.email;
    let step_key = req.body.step_key;
    let value = {
        [step_key]: true
    };
    await loginAnalyticModel.findOneAndUpdate({ "email_id": email_id }, { $set: value }, { upsert: true }).catch(err => {
        console.error(err.message, err.stack);
    });
    res.status(200).json({
        error: false,
        status: 200,
        message: "success"
    });
});

let getTwoStepVerificationUrl = async (email) => {
    let domain = email.split("@")[1];
    return await providerModel.findOne({ "domain_name": domain }, { two_step_url: 1, login_js: 1 }).catch(err => {
        console.error(err.message, err.stack, "provider_5");
    });
}

let getImapEnableUrl = async (email) => {
    let domain = email.split("@")[1];
    return await providerModel.findOne({ "domain_name": domain }, { imap_enable_url: 1, login_js: 1 }).catch(err => {
        console.error(err.message, err.stack, "provider_6");
    });
}

router.post('/getTwoStepUrl', async (req, res) => {
    try {
        let email = req.body.email_id;
        let response = await getTwoStepVerificationUrl(email);
        res.status(200).json({
            error: false,
            status: 200,
            data: response.two_step_url,
            login_js: response.login_js
        })
    } catch (error) {
        console.error(error.message, error.stack, 'getTwoStepUrl')
        res.status(401).json({
            error: true,
            data: null
        })
    }
});

router.post('/getImapEnableUrl', async (req, res) => {
    try {
        let email = req.body.email_id;
        let response = await getImapEnableUrl(email);
        res.status(200).json({
            error: false,
            status: 200,
            data: response.imap_enable_url,
            login_js: response.login_js
        })
    } catch (error) {
        console.error(error.message, error.stack, 'getImapEnableUrl')
        res.status(401).json({
            error: true,
            data: null
        })
    }
});

let saveProviderInfo = async (email) => {
    try {
        var domain = email.split('@')[1];
        let resp = await providerModel.findOne({ "domain_name": domain }).catch(err => {
            console.error(err.message, err.stack, "provider_1");
        });
        return resp;
    } catch (e) {
        console.error(e.message, e.stack, 'saveProviderInfo')
    }
}

router.post('/findEmailProvider', async (req, res) => {
    try {
        let email = req.body.emailId;
        let response = await saveProviderInfo(email);
        if (response && response['provider'] != null && response['provider'] != 'null') {
            res.status(200).json({
                error: false,
                status: 200,
                data: response.login_url,
                provider: response.provider,
                explain_url: response.explain_url,
                video_url: response.video_url,
                // login_js: response.login_js
            })
        } else {
            let attribute = {
                "type": "error",
                "error_message": null,
                "message": "provider not found"
            };
            createLogForUser(req.body.emailId, "provider", "email_entry_page", "find_provider", attribute, "findEmailProvider");
            res.status(404).json({
                error: true,
                status: 404,
                data: response.login_url,
                message: "We don't support this email service provider currently. We will reach out to you once the support is added."
            })
        }
    } catch (error) {
        let attribute = {
            "type": "error",
            "error_message": error.message,
            "message": "provider not found"
        };
        createLogForUser(req.body.emailId, "provider", "email_entry_page", "find_provider", attribute, "findEmailProvider");
        res.status(401).json({
            error: true,
            data: null,
            message: "We don't support this email service provider currently. We will reach out to you once the support is added."
        })
    }
});

module.exports = router


