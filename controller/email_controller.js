'use strict'
const express = require('express');
const email = require('../models/emailDetails');
const Request = require("request");
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
const GetEmailQuery = require("../helper/getEmailQuery").GetEmailQuery;
const router = express.Router();
const { google } = require('googleapis');
const gmail = google.gmail('v1');
const DeleteEmail = require("../helper/deleteEmail").DeleteEmail;
const TrashEmail = require("../helper/trashEmail").TrashEmail;
const APPROX_TWO_MONTH_IN_MS = 4 * 30 * 24 * 60 * 60 * 1000;
const MailScraper = require("../helper/mailScraper").MailScraper;
fm.Include("com.anoop.email.Parser");
fm.Include("com.jeet.memdb.RedisDB");
fm.Include("com.anoop.gmail.Gmail");
fm.Include("com.anoop.gmail.Scraper");
fm.Include("com.anoop.gmail.Label");
fm.Include("com.anoop.model.EmailDetail");
fm.Include("com.anoop.model.EmailInfo");
let EmailInfo = com.anoop.model.EmailInfo;
let EmailDetail = com.anoop.model.EmailDetail;
let Gmail = com.anoop.gmail.Gmail;
let Label = com.anoop.gmail.Label;
let Scraper = com.anoop.gmail.Scraper;
let RedisDB = com.jeet.memdb.RedisDB;

/*
Thsi api for Reverting Back Trash Email from Trash folder to Inbox.
*/
router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        const tokenInfo = req.token;
        let emaildetail = await EmailDetail.get({userId: tokenInfo.user_id, from_email: req.body.from_email, status: "trash"});
        let emailids = await EmailInfo.getEmailIdsByEmailDetail(emaildetail);
        let gmailInstance = await Gmail.getInstanceForUser(tokenInfo.user_id);
        await Label.moveTrashToInbox(gmailInstance, emailids);
        await EmailDetail.updateStatus({_id: emaildetail._id},  "keep");
    } catch (ex) {
        console.error(ex.message, ex.stack,"2");
        res.sendStatus(400);
    }
});


/*
This api for Moving Email From INbox to SUbscribed Folder.(Whne swipe Left)
*/
router.post('/moveEmailToExpbit', async (req, res) => {
    try {
        const {from_email, is_unscubscribe} = req.body.from_email;
        const tokenInfo = req.token;
        let gmailInstance = await Gmail.getInstanceForUser(tokenInfo.user_id);
        if(is_unscubscribe) {
            /// emails are aleady in unsub folder
            let emaildetail = await EmailDetail.get({userId: tokenInfo.user_id, from_email: from_email, status: "move"});
            let emailids = await EmailInfo.getEmailIdsByEmailDetail(emaildetail);
            await Label.moveTrashToInbox(gmailInstance, emailids);
            await EmailDetail.updateStatus({_id: emaildetail._id},  "keep");
        } else {
            // no status as it may has unused
            let emaildetail = await EmailDetail.get({userId: tokenInfo.user_id, from_email: from_email});
            let emailids = await EmailInfo.getEmailIdsByEmailDetail(emaildetail);
            await Label.moveInboxToUnsub(gmailInstance, emailids);
            await EmailDetail.updateStatus({_id: emaildetail._id},  "move");
        }
    } catch (ex) {
        console.error(ex.message, ex.stack,"4");
        res.sendStatus(400);
    }
});


/*
This Api for Scrapping Mail from INbox.
Based on user Information Email Inbox will be scrape
*/
router.post('/getMailInfo', async (req, res) => {
    try {
            let gmailInstance = await Gmail.getInstanceForUser(req.token.user_id);
            let scraper = Scraper.new(gmailInstance);
            scraper.start();
            res.status(200).json({
                error: false,
                data: "scrape"
            })
        
    } catch (ex) {
        console.error(ex.message, ex.stack,"6");
        res.sendStatus(400);
    }
});

router.post('/getMailListForSender', async (req, res) => {
    try {
        const doc = req.token;
        let emaildetail = await EmailDetail.get({userId: req.token.user_id, from_email: req.body.from_email});
        
        res.status(200).json({
            error: false,
            data: emailinfos
        })
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, err.stack,"7");
    }
});



/*
This Api for Getting all Mail Subscri for Home screen for App.
This will get Filter subcription(new subscription only), unread Mail Info and total Count
*/
router.post('/readMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        let keylist = await RedisDB.getKEYS(doc.user_id);
        if (keylist && keylist.length != 0) {
            keylist.forEach(async element => {
                let mail = await RedisDB.popData(element);
                if (mail.length != 0) {
                    let result = await RedisDB.findPercent(mail);
                    if (result) {
                        let from_email_id = await Expensebit.saveAndReturnEmailData(JSON.parse(mail[0]), doc.user_id)
                        await Expensebit.storeBulkEmailInDB(mail,from_email_id);
                    }
                }
            });
            await RedisDB.delKEY(keylist);
        }
        const emailinfos = await GetEmailQuery.getAllFilteredSubscription(doc.user_id);
        const unreademail = await GetEmailQuery.getUnreadEmailData(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreademail,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack,"8");
        res.sendStatus(400);
    }
});


/*
This Api will get Profile/statistic Inforamtion for Subcription.
This will get all the subscription,Moved subscription,total email and total ubsubscribe email count.
*/
router.post('/readProfileInfo', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllSubscription(doc.user_id);
        const movedMail = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
        const totalEmail = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        const keepCount = await GetEmailQuery.getTotalKeepSubscription(doc.user_id);
        const trashCount = await GetEmailQuery.getTotalTrashSubscription(doc.user_id);
        const moveCount = await GetEmailQuery.getTotalMoveSubscription(doc.user_id);
        const totalUnscribeEmail = await GetEmailQuery.getTotalUnsubscribeEmailCount(doc.user_id);
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
        console.error(err.message, err.stack,"9");
    }
});


router.post('/readMailInfoPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllFilteredSubscriptionPage(doc.user_id, req.body.skipcount);
    
        const unreademail = await GetEmailQuery.getUnreadEmailData(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreademail,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack,"10");
        res.sendStatus(400);
    }
});

/*
This api will get All unsubscribe Subscription Related Information.
*/
router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadMovedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack,"11");
    }
});


router.post('/getUnsubscribeMailInfoPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllMovedSubscriptionPage(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadMovedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
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
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllFilteredSubscription(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos
        })
    } catch (err) {
        console.error(err.message, err.stack,"12");
    }
});

/*
This api for unsubscribing mail from Inbox.
This api Currently not using Its under development.
*/
router.post('/unSubscribeMail', async (req, res) => {
    try {
        const from_email = req.body.from_email;
        const mailList = await email.findOne({ "from_email": from_email }).catch(err => {
            console.error(err.message, err.stack,"15");
        });
        if (mailList) {
            const settings = {
                "url": mailList.unsubscribe,
                "method": "get"
            }
            Request(settings, async (error, response, body) => {
                if (error) {
                    return console.error(err.message, err.stack,"16");
                }
            });
        }
    } catch (ex) {
        console.error(ex.message, ex.stack,"17");
        res.sendStatus(400);
    }
});


/*
This api for getting only trash suscription information.
*/
router.post('/getDeletedEmailData', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllTrashSubscription(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadTrashEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack,"18");
    }
});

router.post('/getDeletedEmailDataPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllTrashSubscriptionPage(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadTrashEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
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
        EmailDetail.updateStatus({user_id: req.token.user_id, from_email: req.body.from_email}, "keep");
        res.sendStatus(200)
    } catch (ex) {
        console.error(ex.message, ex.stack,"20");
        res.sendStatus(400);
    }
});


/*
This Api for getting only keeped subscription Information.
*/
router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllKeepedSubscription(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack,"21");
    }
});
/// is it being used 
router.post('/getKeepedMailInfoPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllKeepedSubscriptionPage(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
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

