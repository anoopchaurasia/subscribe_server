
'use strict'
const express = require('express');
const router = express.Router();
const email = require('../models/emailDetails');
const emailInformation = require('../models/emailInfo');
fm.Include("com.anoop.imap.Controller");
let Controller = com.anoop.imap.Controller;


// read mail using the user token
router.post('/readZohoMail', async (req, res) => {
    try {
        let user = req.user; 
        let is_finished = await Controller.isScanFinished(user._id);
        if (is_finished == "false") {
            return res.status(202).json({
                error: false,
                data: "already scaning"
            });
        }
        Controller.sendToProcessServer(req.user._id.toHexString());
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
        const user = req.user;
        let response = await Controller.validCredentialCheck(user).catch(err => {
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
            console.log("success");
            return res.status(200).json({
                error: false,
                data: "scrape"
            });
        } else if (response == false) {
            console.log("reject");
            return res.status(401).json({
                error: false,
                data: "scrscrap errorape"
            });
        }
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
    return;
});


router.post('/getMailInfo', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await getAllsubscription(user).catch(err => {
            console.error(err.message, err.stack);
        });
        const total = await getTotalEmailCount(user).catch(err => {
            console.error(err.message, err.stack);
        });
        res.status(200).json({
            error: false,
            data: emailinfos,
            // unreadData: unreademail,
            totalEmail: total
        })
        
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});


router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await getAllKeepedSubscription(user);
        if (emailinfos) {
            const total = await getTotalEmailCount(user);
            res.status(200).json({
                error: false,
                data: emailinfos,
                // unreadData: unreadData,
                totalEmail: total
            })
        }
        
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await getAllUnsubscribeSubscription(user);
        if (emailinfos) {
            const total = await getTotalEmailCount(user);
            res.status(200).json({
                error: false,
                data: emailinfos,
                // unreadData: unreadData,
                totalEmail: total
            })
        }
        
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, ex.stack);
    }
});

router.post('/getTrashMailInfo', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await getAllTrashSubscription(user);
        if (emailinfos) {
            const total = await getTotalEmailCount(user);
            res.status(200).json({
                error: false,
                data: emailinfos,
                // unreadData: unreadData,
                totalEmail: total
            })
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, err.stack);
    }
});

router.post('/getEmailSubscription', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await getAllsubscription(user);
        res.status(200).json({
            error: false,
            data: emailinfos
        })
    } catch (err) {
        console.error(err.message, err.stack);
    }
});


router.get('/getManualInfo', async (req, res) => {
    try {
        let user = req.user;
        let emails = await Controller.EmailDetail.findBySource(user).catch(err => {
            console.error(err.message, err.stack);
        });
        res.status(200).json({
            error: false,
            status: 200,
            data: emails
        })
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});

router.post('/saveProfileInfo', async (req, res) => {
    try {
        let user = req.user;
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
        await Controller.UserModel.updateUserById({ "_id": user._id }, {$set: userObj}).catch(err => {
            console.error(err.message, err.stack);
        });
        user = await Controller.UserModel.get({_id: user._id});
        res.status(200).json({
            error: false,
            status: 200,
            data: user
        })
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});



async function getTotalEmailCount(user) {
    let totalNL = await email.find({ "user_id": user._id }).catch(err => {
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

async function getAllsubscription(user) {
    const emails = await email.find({ "status": "unused", "user_id": user._id }, { from_email: 1, from_email_name: 1 }).exec()
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

async function getAllKeepedSubscription(user) {
    const emails = await email.find({ "status": "keep", "user_id": user._id }, { from_email: 1, from_email_name: 1 }).exec()
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

async function getAllUnsubscribeSubscription(user) {
    const emails = await email.find({ "status": "move", "user_id": user._id }, { from_email: 1, from_email_name: 1 }).exec()
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

async function getAllTrashSubscription(user) {
    const emails = await email.find({ "status": "trash", "user_id": user._id }, { from_email: 1, from_email_name: 1 }).exec()
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


router.post('/onLaunchScrapEmail', async (req, res) => {
    try {
        const user = req.user;
        Controller.extractOnLaunchEmail(user).catch(err => {
            console.error(err.message, err.stack);
            Controller.scanFinished(user);
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

module.exports = router