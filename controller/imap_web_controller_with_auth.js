'use strict'
const express = require('express');
const router = express.Router();
const simpleParser = require('mailparser').simpleParser;
const Imap = require('imap');
const DeviceInfo = require('../models/deviceoInfo');
const email = require('../models/emailDetails');
const emailInformation = require('../models/emailInfo');
const userAppLog = require('../models/userAppLog');
const UserModel = require('../models/user');
const token_model = require('../models/tokeno');
const providerModel = require('../models/provider');
const AuthTokenModel = require('../models/authoToken');
const fcmToken = require('../models/fcmoToken');
const emailDetailsModel = require('../models/emailDetails');
const emailInformationModel = require('../models/emailInfo');
const unlistedProviderModel = require('../models/unlistedProvider');
const loginAnalyticModel = require('../models/loginAnalytic');
const cheerio = require('cheerio');
const jwt = require('jsonwebtoken');
const uniqid = require('uniqid');
var crypto = require('crypto');
var randomstring = require("randomstring");
var dns = require('dns');
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

// read mail using the user token
router.post('/readZohoMail', async (req, res) => {
    try {
        const doc = req.token;
        Controller.extractEmail(doc).catch(err => {
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

router.post('/readSpamMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        Controller.extractEmail(doc,'[Gmail]/Spam').catch(err => {
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

router.post('/deleteSpamMail', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        let data = await Controller.deleteMail(doc,"[Gmail]/Spam");
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
        let data = await Controller.deleteMail(doc,"[Gmail]/Trash");
        res.status(200).json(data);
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
    return;
});

router.post('/onLaunchScrapEmail', async (req, res) => {
    try {
        const doc = req.token;
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
        const doc = req.token;
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
        const doc = req.token;
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
        const doc = req.token;
        if (doc) {
            const emailinfos = await getAllUnsubscribeSubscription(doc.user_id);
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

router.post('/getTrashMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            const emailinfos = await getAllTrashSubscription(doc.user_id);
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

router.post('/getEmailSubscription', async (req, res) => {
    try {
        const doc = req.token;
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

router.post('/saveProfileInfo', async (req, res) => {
    try {
        const doc = req.token;
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
        const doc = req.token;
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
        const doc = req.token;
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
        const doc = req.token;
        Controller.unusedToUnsub(doc, req.body.fromEmail);
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

router.post('/revertUnsubscribeZohoMail', async (req, res) => {
    try {
        const doc = req.token;
        Controller.unsubToKeep(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "unsubtokeep"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/leftUnsubToTrashZohoMail', async (req, res) => {
    try {
        const doc = req.token;
        Controller.unsubToTrash(doc, req.body.fromEmail);
        return res.status(200).json({
            error: false,
            data: "unsubtotrash"
        })

    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});

router.post('/leftInboxToTrashZohoMail', async (req, res) => {
    try {
        const doc = req.token;
        Controller.keepToTrash(doc, req.body.fromEmail);
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

router.post('/imapManualUnsubEmailFromUser', async (req, res) => {
    try {
        const doc = req.token;
        let sender_email = req.body.sender_email;
        let array = sender_email.split(",") || sender_email.split(";");
        array.forEach(async element => {
            console.log(element)
            element = element.trim();
            let validate = await EmailValidate.validate(element);
            console.log("is valid", validate)
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
        const doc = req.token;
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
        const doc = req.token;
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
        const doc = req.token;
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


