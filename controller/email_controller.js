'use strict'
const express = require('express');
const email = require('../models/emailDetails');
const GetEmailQuery = require("../helper/getEmailQuery").GetEmailQuery;
const router = express.Router();
const SenderEmailModel = require("../models/senderMail");
const ecommerce_cmpany = ["no-reply@flipkart.com", "auto-confirm@amazon.in"];
fm.Include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;

router.post('/manualUnsubEmailFromUser', async (req, res) => {
    
});

router.post('/manualTrashEmailFromUser', async (req, res) => {
   
});


/*
This Api for Getting all Mail Subscri for Home screen for App.
This will get Filter subcription(new subscription only), unread Mail Info and total Count
*/
router.post('/readMailInfo', async (req, res) => {
    try {
        const user = req.user;

        const emailinfos = await GetEmailQuery.getAllFilteredSubscription(user._id);
        const unreademail = await GetEmailQuery.getUnreadEmailData(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        const ecom_data = await SenderEmailModel.find({ senderMail: { $in: ecommerce_cmpany },user_id:user._id });
        let finished = false;
        let is_finished = await BaseController.isScanFinished(user._id);
        if (is_finished && is_finished == "true") {
            console.log("is_finished here-> ", is_finished);
            finished = true;
            BaseController.updateUserByActionKey(user._id, { "last_launch_date": new Date() }).catch(err => {
                console.error(err.message, err.stack, "launch date set error");
            });
        }
        if (is_finished === null) {
            await BaseController.scanFinished(user._id);
        }
        await BaseController.handleRedis(user._id, false);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreademail,
            totalEmail: total,
            finished: finished,
            is_ecommerce: ecom_data && ecom_data.length > 0 ? true : false
        })
    } catch (err) {
        console.error(err.message, err.stack, "8");
        res.sendStatus(400);
    }
});



/*
This Api will get Profile/statistic Inforamtion for Subcription.
This will get all the subscription,Moved subscription,total email and total ubsubscribe email count.
*/
router.post('/readProfileInfo', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllSubscription(user._id);
        const movedMail = await GetEmailQuery.getAllMovedSubscription(user._id);
        const totalEmail = await GetEmailQuery.getTotalEmailCount(user._id);
        const keepCount = await GetEmailQuery.getTotalKeepSubscription(user._id);
        const trashCount = await GetEmailQuery.getTotalTrashSubscription(user._id);
        const moveCount = await GetEmailQuery.getTotalMoveSubscription(user._id);
        const totalUnscribeEmail = await GetEmailQuery.getTotalUnsubscribeEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            moveMail: movedMail,
            totalEmail: totalEmail,
            moveCount: moveCount,
            trashCount: trashCount,
            keepCount: keepCount,
            totalUnscribeEmail: totalUnscribeEmail
        })
    } catch (err) {
        console.error(err.message, err.stack, "9");
    }
});

router.post('/readMailInfoPage', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllFilteredSubscriptionPage(user._id, req.body.skipcount);

        const unreademail = await GetEmailQuery.getUnreadEmailData(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreademail,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack, "10");
        res.sendStatus(400);
    }
});

/*
This api will get All unsubscribe Subscription Related Information.
*/
router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllMovedSubscription(user._id);
        let unreadData = await GetEmailQuery.getUnreadMovedEmail(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack, "11");
    }
});

router.post('/getUnsubscribeMailInfoPage', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllMovedSubscriptionPage(user._id);
        let unreadData = await GetEmailQuery.getUnreadMovedEmail(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack, "11");
    }
});

/*
This api will get Filer subsciption(new only).
*/
router.post('/getEmailSubscription', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllFilteredSubscription(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos
        })
    } catch (err) {
        console.error(err.message, err.stack, "12");
    }
});


/*
This api for getting only trash suscription information.
*/
router.post('/getDeletedEmailData', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllTrashSubscription(user._id);
        let unreadData = await GetEmailQuery.getUnreadTrashEmail(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "18");
    }
});

router.post('/getDeletedEmailDataPage', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllTrashSubscriptionPage(user._id);
        let unreadData = await GetEmailQuery.getUnreadTrashEmail(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "18");
    }
});


/*
This api for changing keeped subscription.(when swipe right)
this will changed changed is_keeped value in database for keped subscription
*/
router.post('/keepMailInformation', async (req, res) => {
    try {
        const from_email = req.body.from_email;
        const user = req.user;
        var oldvalue = {
            "from_email": from_email,
            "user_id": user._id
        };
        var newvalues = {
            $set: {
                "status": "keep",
                "status_date": new Date()
            }
        };
        await email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.error(err.message, err.stack, "19");
        });
        res.sendStatus(200)
    } catch (ex) {
        console.error(ex.message, ex.stack, "20");
        res.sendStatus(400);
    }
});


/*
This Api for getting only keeped subscription Information.
*/
router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllKeepedSubscription(user._id);
        let unreadData = await GetEmailQuery.getUnreadKeepedEmail(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "21");
    }
});

router.post('/getKeepedMailInfoPage', async (req, res) => {
    try {
        const user = req.user;
        const emailinfos = await GetEmailQuery.getAllKeepedSubscriptionPage(user._id);
        let unreadData = await GetEmailQuery.getUnreadKeepedEmail(user._id);
        const total = await GetEmailQuery.getTotalEmailCount(user._id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "21");
    }
});

module.exports = router

