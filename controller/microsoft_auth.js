
let express = require('express');
let users = require('../models/user');
let token_model = require('../models/tokeno');
let router = express.Router();
const Outlook = require("../helper/outlook").Outlook;

Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}
fm.Include("com.anoop.outlook.Controller");
let Controller = com.anoop.outlook.Controller;

router.get('/getOutLookApiUrl', async function (req, res) {
    let returnVal = await Controller.getOutlookUrl().catch(err => {
        console.error(err);
    });
    if (returnVal) {
        res.status(200).json({
            error: false,
            data: returnVal
        })
    } else {
        res.status(400).json({
            error: true,
            data: null
        })
    }
});

router.get('/auth/callback', async function (req, res) {
    let auth_code = req.query.code;
    let state = req.query.state;
    await Controller.createAndStoreToken(auth_code, state).catch(err => {
        console.error(err);
    });
    res.send();
});

router.get('/getPushNotification', async function (req, res) {
    console.log("came here for url")
});


router.get('/getAuthTokenForApi', async function (req, res) {
    let state_code = req.query.state_code;
    let user = await users.findOne({ state: state_code }).catch(err => {
        console.error(err);
    });
    if (user) {
        let tokenData = await token_model.findOne({ "user_id": user._id }).catch(err => {
            console.error(err);
        });
        var userdata = {
            state: null
        };
        await Outlook.updateUserInfo({ "state": state_code }, userdata);
        res.status(200).json({
            error: false,
            data: tokenData,
            user: user
        })
    } else {
        res.status(404).json({
            error: true,
            data: "no user found"
        })
    }
});


router.post('/getPushNotification', async function (req, res) {
    if (req.query && req.query.validationToken) {
        res.setHeader('content-type', 'text/plain');
        res.write(req.query.validationToken);
        res.end();
    } else {
        let data = req.body.value;
        await Controller.getNotificationEmailData(data).catch(err => {
            console.error(err);
        });
        res.sendStatus(202);
    }
});

router.post('/getMail', async function (req, resp, next) {
    let user = req.user;
    await Controller.extractEmail(user._id).catch(e => console.error(e));
    resp.status(200).json({
        error: false,
        message: "scrapping"
    })
})

router.post('/setPrimaryEmail', async (req, res) => {
    try {
        let user = req.user;
        let email = req.body.email;
        let ipaddress = req.header('x-forwarded-for') || req.connection.remoteAddress;
        if (email != null) {
            await Controller.setPrimaryEmail(user._id, email, ipaddress);
            res.status(200).json({
                error: false,
                status: 200
            })
        } else {
            res.status(400).json({
                error: true,
                status: 400
            })
        }
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "data": error })
    }
});

router.post('/moveEmailFromInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let user = req.user;
        await Controller.moveEmailFromInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "moving"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertMailToInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let user = req.user;
        await Controller.revertUnsubToInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "revert"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
       let user = req.user;

        await Controller.revertTrashToInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "revert"
        })
     
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/moveEmailToTrashFromInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let user = req.user;
        await Controller.moveEmailToTrashFromInbox(user._id,from_email);
        res.status(200).json({
            error: false,
            data: "trash"
        })
    } catch (ex) {
        res.sendStatus(400);
    }
});

module.exports = router