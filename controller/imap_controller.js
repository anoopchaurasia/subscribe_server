'use strict'
const express = require('express');
const router = express.Router();
const DeviceInfo = require('../models/deviceoInfo');
const email = require('../models/emailDetails');
const emailInformation = require('../models/emailInfo');
const userAppLog = require('../models/userAppLog');
const UserModel = require('../models/user');
const token_model = require('../models/tokeno');
const providerModel = require('../models/provider');
const fcmToken = require('../models/fcmoToken');
const unlistedProviderModel = require('../models/unlistedProvider');
const loginAnalyticModel = require('../models/loginAnalytic');
const uniqid = require('uniqid');
var Raven = require('raven');
const app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());

fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;
fm.Include("com.anoop.email.Email");
let EmailValidate = com.anoop.email.Email;

//login or signup with the credentials and generate the token and return back to user
router.post('/loginWithImap', async (req, res) => {
    try {
        let profile = await saveProviderInfo(req.body.username.toLowerCase());
        let ipaddress = req.header('x-forwarded-for') || req.connection.remoteAddress;
        let response = await Controller.login(req.body.username.toLowerCase(), req.body.password, profile, ipaddress, 'app').catch(err => {
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
        console.error(error.message, error.stack, 'loginwithimap')
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
        console.error(error.message, error.stack, 'getTwoStepUrl app')
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
        console.error(e.message, e.stack, 'saveProviderInfo method');
    }
}

router.post('/findEmailProvider', async (req, res) => {
    try {
        let email = req.body.emailId;
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


// read mail using the user token
router.post('/readZohoMail', async (req, res) => {
    try {
        // const doc = await token_model.findOne({ "token": req.body.token });
        // Controller.extractEmail(doc, 'INBOX').catch(err => {
        //     console.error(err.message, err.stack);
        //     Controller.scanFinished(doc.user_id);
        // });
        Controller.sendToProcessServer(req.body.token);
        res.status(200).json({
            error: false,
            data: "scrape"
        });
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
    return;
});

router.post('/readSpamMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.extractEmail(doc, '[Gmail]/Spam').catch(err => {
            console.error(err.message, err.stack);
            Controller.scanFinished(doc.user_id);
        });
        res.status(200).json({
            error: false,
            data: "scrape"
        });
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
    return;
});


router.post('/validCredentialCheck', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        let response = await Controller.validCredentialCheck(doc).catch(err => {
            if (err.message.includes("Invalid credentials")) {
                console.error(err.message, "got error here");
                return res.status(400).json({
                    error: true,
                    data: "Invalid Credential"
                });
            } else {
                console.error(err.message, "got error here");
                return res.status(400).json({
                    error: true,
                    data: "Invalid Credential"
                });
            }
        });
        if (response == true) {
            return res.status(200).json({
                error: false,
                data: "scrape"
            });
        } else if (response == false) {
            return res.status(401).json({
                error: false,
                data: "scrscrap errorape"
            });
        }
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});

router.post('/deleteSpamMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        let data = await Controller.deleteMail(doc, "[Gmail]/Spam");
        res.status(200).json(data);
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
    return;
});

router.post('/deleteTrashMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        let data = await Controller.deleteMail(doc, "[Gmail]/Trash");
        res.status(200).json(data);
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
    return;
});

router.post('/onLaunchScrapEmail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.extractOnLaunchEmail(doc).catch(err => {
            console.error(err.message, err.stack);
            Controller.scanFinished(doc.user_id);
        });
        res.status(200).json({
            error: false,
            data: "scrape"
        });
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
    return;
});

router.post('/getMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllsubscription(doc.user_id).catch(err => {
                console.error(err.message, err.stack);
            });
            const total = await getTotalEmailCount(doc.user_id).catch(err => {
                console.error(err.message, err.stack);
            });
            res.status(200).json({
                error: false,
                data: emailinfos,
                // unreadData: unreademail,
                totalEmail: total
            })
        }
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});

router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllKeepedSubscription(doc.user_id);
            if (emailinfos) {
                const total = await getTotalEmailCount(doc.user_id);
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    // unreadData: unreadData,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllUnsubscribeSubscription(doc.user_id);
            if (emailinfos) {
                const total = await getTotalEmailCount(doc.user_id);
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getTrashMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllTrashSubscription(doc.user_id);
            if (emailinfos) {
                const total = await getTotalEmailCount(doc.user_id);
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getEmailSubscription', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllsubscription(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos
            })
        }
    } catch (err) {
        console.error(err.message, err.stack);
    }
});

router.post('/saveProfileInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            let userObj = {
                name: req.body.name,
                "dob": req.body.dob,
                "gender": req.body.sex,
                "ipaddress": req.header('x-forwarded-for') || req.connection.remoteAddress,
                "inactive_at": null
            };
            if (req.body.email != null) {
                userObj.primary_email = req.body.email;
            }
            await UserModel.findOneAndUpdate({ "_id": doc.user_id }, userObj, { upsert: true }).catch(err => {
                console.error(err.message, err.stack);
            })
            let user = await UserModel.findOne({ "_id": doc.user_id });
            res.status(200).json({
                error: false,
                status: 200,
                data: user
            })
        }
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});

async function getTotalEmailCount(user_id) {
    let totalNL = await email.find({ "user_id": user_id }).catch(err => {
        console.error(err.message, err.stack);
    });
    let total = 0;
    let count = 0;
    for (let i = 0; i < totalNL.length; i++) {
        count = await emailInformation.countDocuments({ 'from_email_id': totalNL[i]._id }).catch(err => {
            console.error(err.message, err.stack);
        });
        total = total + count;
    }
    return total;
}

async function getAllsubscription(user_id) {
    const emails = await email.find({ "status": "unused", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}

async function getAllKeepedSubscription(user_id) {
    const emails = await email.find({ "status": "keep", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}

async function getAllUnsubscribeSubscription(user_id) {
    const emails = await email.find({ "status": "move", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}

async function getAllTrashSubscription(user_id) {
    const emails = await email.find({ "status": "trash", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}

router.post('/trashZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.unusedToTrash(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "move"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/keepZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.unusedToKeep(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "keep"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack);
        res.sendStatus(400);
    }
});

router.post('/unsubscribeZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.unusedToUnsub(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "move"
        })
    } catch (error) {
        console.log(error);
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/revertUnsubscribeZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.unsubToKeep(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "unsubtokeep"
        })
    } catch (error) {
        console.log(error);
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/leftUnsubToTrashZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.unsubToTrash(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "unsubtotrash"
        })

    } catch (error) {
        console.log(error);
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/leftInboxToTrashZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.keepToTrash(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "trashtoinbox"
        })
    } catch (error) {
        console.log(error);
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/imapManualUnsubEmailFromUser', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        let sender_email = req.body.sender_email;
        let array = sender_email.split(",") || sender_email.split(";");
        array.forEach(async element => {
            console.log(element);
            element = element.trim();
            let validate = await EmailValidate.validate(element);
            console.log("is valid", validate);
            if (validate) {
                await Controller.manualUnusedToUnsub(doc, element);
            }
        });
        res.status(200).json({
            error: false,
            data: "scrape"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});

router.post('/imapManualTrashEmailFromUser', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        let sender_email = req.body.sender_email;
        let array = sender_email.split(",") || sender_email.split(";");
        array.forEach(async element => {
            console.log(element)
            element = element.trim();
            let validate = await EmailValidate.validate(element);
            console.log("is valid", validate)
            if (validate) {
                await Controller.manualUnusedToTrash(doc, element);
            }
        });
        res.status(200).json({
            error: false,
            data: "scrape"
        })

    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});

router.post('/revertTrashZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.trashToKeep(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "trashtoinbox"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/revertInboxToUnsubscribeImapZohoMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.keepToUnsub(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "trashtoinbox"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});


module.exports = router


