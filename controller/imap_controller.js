'use strict'
const express = require('express');
const router = express.Router();
const DeviceInfo = require('../models/deviceoInfo');
const providerModel = require('../models/provider');
const fcmToken = require('../models/fcmoToken');
const unlistedProviderModel = require('../models/unlistedProvider');
const loginAnalyticModel = require('../models/loginAnalytic');
const uniqid = require('uniqid');
var legit = require('legit');

fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;

//login or signup with the credentials and generate the token and return back to user
router.post('/loginWithImap', async (req, res) => {
    try {
        let profile = await saveProviderInfo(req.body.username.toLowerCase());
        let ipaddress = req.header('x-forwarded-for') || req.connection.remoteAddress;
        let response = await Controller.login(req.body.username.toLowerCase(), req.body.password, profile,  req.query.client, ipaddress).catch(err => {
            console.error(err.message, err, "imap_connect_error", req.body.username);
            Controller.logToSentry(err, { tags: { email_domain: req.body.username.split("@")[1], pass_length: req.body.password.length } })
            let attribute = {
                "type": "error",
                "error_message": err.message,
                "message": "login_failed"
            };
            Controller.createLogForUser(req.body.username, "login", "login_page", "imap_login", attribute, "loginWithImap");
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
            return res.status(200).json({
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
        console.log("here", error)
    }
});



router.post('/saveOnLaunchDeviceData', async (req, res) => {
    let deviceData = req.body.data;
    let userUniqueId = deviceData['serialno'] + uniqid() + uniqid() + uniqid() + uniqid();
    deviceData['user_id'] = null;
    deviceData['userUniqueId'] = userUniqueId;
    deviceData['deviceIpAddress'] = { "ip": req.header('x-forwarded-for') || req.connection.remoteAddress };
    await DeviceInfo.findOneAndUpdate({ "userUniqueId": userUniqueId }, { $set: deviceData }, { upsert: true }).catch(err => {
        console.error(err.message, err.stack, "27");
    });
    let dinfo = await DeviceInfo.findOne({ "userUniqueId": userUniqueId }).catch(err => {
        console.error(err.message, err.stack, "27");
    });
    let tokenInfo = { "device_id": dinfo._id, "fcm_token": req.body.fcmToken };
    await fcmToken.findOneAndUpdate({ "device_id": dinfo._id }, tokenInfo, { upsert: true }).catch(err => {
        console.error(err.message, err.stack, "26");
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
    // console.log(req.body)
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
    // console.log(req.body)
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
        console.log("here", error)
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
        console.log("here", error)
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
        if (resp) {
            return resp;
        } else {
            const response = await legit(email);
            if (response.isValid) {
                let mxString = response.mxArray.map(x => { return x.exchange }).toString();
                let mxr = response.mxArray[0].exchange;
                let provider = "";
                let login_url = "";
                let two_step_url = "";
                let imap_enable_url = "";
                let imap_host = "";
                let port = "";
                let explain_url = "";
                let video_url = null;
                let login_js = null;
                // let less_secure_url = "";

                if (mxr.includes("zoho")) {
                    provider = "zoho";
                    login_url = "https://accounts.zoho.com/u/h#home";
                    imap_host = "imappro.zoho.com";
                    two_step_url = "https://accounts.zoho.com/signin?servicename=AaaServer&serviceurl=%2Fu%2Fh";
                    imap_enable_url = "https://accounts.zoho.com/signin?servicename=VirtualOffice&signupurl=https://www.zoho.com//mail/zohomail-pricing.html?src=zmail-signup&serviceurl=https%3A%2F%2Fmail.zoho.com%2Fzm%2F"
                    explain_url = "https://www.zoho.com/mail/help/adminconsole/two-factor-authentication.html";
                    port = 993;
                    video_url = "https://www.youtube.com/watch?v=zSOlY0lT_Q0&feature=youtu.be";
                    login_js = "document.getElementById('lid').value";

                } else if (mxr.includes("aol.mail")) {
                    provider = "aol";
                    login_url = "https://login.aol.com/";
                    imap_host = "imap.aol.com";
                    two_step_url = "https://login.aol.com/account/security";
                    imap_enable_url = "https://login.aol.com/account/security";
                    // explain_url = "https://help.aol.com/articles/allow-apps-that-use-less-secure-sign-in";
                    explain_url = "https://help.aol.com/articles/2-step-verification-stronger-than-your-password-alone";
                    port = 993;
                    login_js = "document.getElementById('login-username').value";

                } else if (mxr.includes("yahoo")) {
                    provider = "yahoo";
                    login_url = "https://login.yahoo.com/?done=https%3A%2F%2Flogin.yahoo.com%2Faccount%2Fsecurity%3F.scrumb%3D0";
                    imap_host = "imap.mail.yahoo.com";
                    two_step_url = "https://login.yahoo.com/?done=https%3A%2F%2Flogin.yahoo.com%2Faccount%2Fsecurity%3F.scrumb%3D0";
                    imap_enable_url = "https://login.yahoo.com/";
                    explain_url = "https://help.yahoo.com/kb/SLN15241.html";
                    port = 993;
                    video_url = "https://www.youtube.com/watch?v=T_vwn1JWrWA&feature=youtu.be";
                    login_js = "document.getElementById('login-username').value";

                } else if (mxr.includes("google")) {
                    provider = "gmail";
                    login_url = "https://accounts.google.com/signin/v2/identifier";
                    imap_host = "imap.gmail.com";
                    two_step_url = "https://accounts.google.com/signin/v2/sl/pwd?service=accountsettings&hl=en-US&continue=https%3A%2F%2Fmyaccount.google.com%2Fintro%2Fsecurity&csig=AF-SEnaOyCyBzaeOOzFJ%3A1561794482&flowName=GlifWebSignIn&flowEntry=ServiceLogin";
                    imap_enable_url = "https://accounts.google.com/signin/v2/identifier";
                    explain_url = "https://support.google.com/mail/answer/185833?hl=en";
                    port = 993;
                    login_js = "document.getElementById('identifierId').value";

                } else if (mxr.includes("outlook")) {
                    provider = "outlook";
                    login_url = "https://login.live.com/login.srf";
                    imap_host = "imap-mail.outlook.com";
                    two_step_url = "https://login.live.com/login.srf?wa=wsignin1.0&rpsnv=13&ct=1562045255&rver=7.0.6738.0&wp=MBI_SSL&wreply=https%3A%2F%2Faccount.microsoft.com%2Fauth%2Fcomplete-signin%3Fru%3Dhttps%253A%252F%252Faccount.microsoft.com%252Fsecurity%253Frefd%253Daccount.microsoft.com%2526ru%253Dhttps%25253A%25252F%25252Faccount.microsoft.com%25252Fsecurity%25253Frefd%25253Dsupport.microsoft.com%2526destrt%253Dsecurity-landing%2526refp%253Dsignedout-index&lc=1033&id=292666&lw=1&fl=easi2&ru=https%3A%2F%2Faccount.microsoft.com%2Faccount%2FManageMyAccount%3Frefd%3Dsupport.microsoft.com%26ru%3Dhttps%253A%252F%252Faccount.microsoft.com%252Fsecurity%253Frefd%253Dsupport.microsoft.com%26destrt%3Dsecurity-landing";
                    imap_enable_url = "https://login.live.com/login.srf";
                    explain_url = "https://support.microsoft.com/en-us/help/12408/";
                    port = 993;
                    login_js = "document.getElementById('i0116').value";

                } else if (mxr.includes("rediffmail")) {
                    provider = "rediffmail";
                    login_url = "https://mail.rediff.com/cgi-bin/login.cgi";
                    imap_host = "imap.rediffmail.com";
                    two_step_url = "https://mail.rediff.com/cgi-bin/login.cgi";
                    imap_enable_url = "https://mail.rediff.com/cgi-bin/login.cgi";
                    explain_url = "";
                    port = 143;

                } else if (mxr.includes("yandex")) {
                    provider = "yandex";
                    login_url = "https://passport.yandex.com/auth";
                    imap_host = "imap.yandex.ru";
                    two_step_url = "https://passport.yandex.com/profile/access/2fa?origin=passport_profile&uid=900317203";
                    imap_enable_url = "https://passport.yandex.com/auth";
                    explain_url = "https://yandex.com/support/passport/authorization/twofa-on.html";
                    port = 993;
                    video_url = "https://www.youtube.com/watch?v=fd92FquFodU&feature=youtu.be";
                    login_js = "document.getElementById('passp-field-login').value";

                } else if (mxr.includes("gmx")) {
                    provider = "gmx";
                    login_url = "https://www.gmx.com/";
                    imap_host = "imap.gmx.com";
                    two_step_url = "https://www.gmx.com/";
                    imap_enable_url = "https://www.gmx.com/";
                    explain_url = "https://www.gmx.com/";
                    port = 993;
                    login_js = "document.getElementById('login-email').value";

                } else if (mxr.includes("mail.ru")) {
                    provider = "mail.ru";
                    login_url = "https://e.mail.ru/login";
                    imap_host = "imap.mail.ru";
                    two_step_url = "https://e.mail.ru/login";
                    imap_enable_url = "https://e.mail.ru/login";
                    explain_url = "https://help.mail.ru/mail-help/security/2auth/activate";
                    port = 993;

                } else if (mxr.includes("protonmail")) {
                    provider = "protonmail";
                    login_url = "https://mail.protonmail.com/login";
                    imap_host = "imap.protonmail.com";
                    two_step_url = "https://mail.protonmail.com/login";
                    imap_enable_url = "https://mail.protonmail.com/login";
                    explain_url = "https://protonmail.com/support/knowledge-base/two-factor-authentication/";
                    port = 993;

                } else if (mxr.includes("me.com")) {
                    provider = "me.com";
                    login_url = "https://appleid.apple.com/#!&page=signin";
                    imap_host = "imap.mail.me.com";
                    two_step_url = "https://appleid.apple.com/";
                    imap_enable_url = "https://appleid.apple.com/#!&page=signin";
                    explain_url = "https://support.apple.com/en-in/HT207198";
                    port = 993;
                    login_js = "document.getElementById('imapuser').value";

                } else if (mxr.includes("icloud.com")) {
                    provider = "icloud";
                    login_url = "https://appleid.apple.com/#!&page=signin";
                    imap_host = "imap.mail.me.com";
                    two_step_url = "https://appleid.apple.com/";
                    imap_enable_url = "https://appleid.apple.com/#!&page=signin";
                    explain_url = "https://support.apple.com/en-in/HT207198";
                    port = 993;
                    login_js = "document.getElementById('imapuser').value";

                } else if (mxr.includes("inbox")) {
                    provider = "inbox.lv";
                    login_url = "https://www.inbox.lv/";
                    imap_host = "mail.inbox.lv";
                    two_step_url = "https://www.inbox.lv/";
                    imap_enable_url = "https://www.inbox.lv/";
                    explain_url = "https://www.inbox.lv/";
                    port = 993;
                    login_js = "document.getElementById('imapuser').value";

                } else if (mxr.includes("mail.com")) {
                    provider = "mail.com";
                    login_url = "https://www.mail.com/int/";
                    imap_host = "imap.mail.com";
                    two_step_url = "https://www.mail.com/int/";
                    imap_enable_url = "https://www.mail.com/int/";
                    explain_url = "https://www.mail.com/int/";
                    port = 993;
                    login_js = "";

                } else {
                    provider = null;
                    login_url = "null";
                    imap_host = "null";
                    two_step_url = "null";
                    imap_enable_url = "null";
                    explain_url = "";
                    port = null;
                }
                let resp = await providerModel.findOneAndUpdate({ "domain_name": domain }, { $set: { login_js, video_url, explain_url, port, imap_host, mxString, provider, login_url, two_step_url, imap_enable_url } }, { upsert: true, new: true }).catch(err => {
                    console.error(err.message, err.stack, "provider_2");
                });
                return resp;
            } else {
                return response;
            }
        }
    } catch (e) {
        console.log(e);
    }
}

router.all('/findEmailProvider', async (req, res) => {
    try {
        let email = req.body.emailId || req.query.emailId;
        let response = await saveProviderInfo(email);
        if (response['provider'] != null && response['provider'] != 'null') {
            res.status(200).json({
                error: false,
                status: 200,
                data: response.login_url,
                provider: response.provider,
                explain_url: response.explain_url,
                video_url: response.video_url,
                login_js: response.login_js
            })
        } else {
            let attribute = {
                "type": "error",
                "error_message": null,
                "message": "provider not found"
            };
            Controller.createLogForUser(req.body.emailId, "provider", "email_entry_page", "find_provider", attribute, "findEmailProvider");
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
        Controller.createLogForUser(req.body.emailId, "provider", "email_entry_page", "find_provider", attribute, "findEmailProvider");
        res.status(401).json({
            error: true,
            data: null,
            message: "We don't support this email service provider currently. We will reach out to you once the support is added."
        })
    }
});

module.exports = router