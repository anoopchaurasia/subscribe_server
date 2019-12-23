'use strict'
const express = require('express');
const email = require('../models/emailDetails');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
const GetEmailQuery = require("../helper/getEmailQuery").GetEmailQuery;
const router = express.Router();
const TrashEmail = require("../helper/trashEmail").TrashEmail;
const SenderEmailModel = require("../models/senderMail");
const APPROX_TWO_MONTH_IN_MS = 4 * 30 * 24 * 60 * 60 * 1000;
const MailScraper = require("../helper/mailScraper").MailScraper;
const ecommerce_cmpany = ["no-reply@flipkart.com", "auto-confirm@amazon.in"];
// fm.Include("com.anoop.email.Parser");
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;


router.post('/senderEmailNotInEmailDetails', async (req, res) => {
    let emailIds = await BaseController.senderEmailNotInEmailDetails(req.body.user_id)
    res.status(200).json({
        error: false,
        data: {
            "emailIds": emailIds
        }
    })
});


router.post('/getLast7daysData', async (req, res) => {
    let emailDetailsWithInfo = await BaseController.getLast7DaysData(req.body.user_id)
    res.json({
        error: false,
        data: emailDetailsWithInfo
    })
});


router.post('/manualUnsubEmailFromUser', async (req, res) => {
    try {
        const token = req.token;
        if (token) {
            let sender_email = req.body.sender_email;
            const authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e.message, e.stack, "5"));
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            Expensebit.createEmailLabel(token.user_id, oauth2Client);
            let label = await Expensebit.findLabelId(oauth2Client);
            console.log(sender_email)
            let array = sender_email.split(",") || sender_email.split(";");
            await array.asyncForEach(async element => {
                await getEmailFromSpecificSender(token.user_id, oauth2Client, null, label, element, true);
            });
            res.status(200).json({
                error: false,
                data: "scrape"
            })
        }
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});

router.post('/manualTrashEmailFromUser', async (req, res) => {
    try {
        const token = req.token;
        if (token) {
            let sender_email = req.body.sender_email;
            const authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e.message, e.stack, "5"));
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            Expensebit.createEmailLabel(token.user_id, oauth2Client);
            let label = await Expensebit.findLabelId(oauth2Client);
            let array = sender_email.split(",") || sender_email.split(";");
            await array.asyncForEach(async element => {
                await getEmailFromSpecificSender(token.user_id, oauth2Client, null, label, element, false);
            });
            res.status(200).json({
                error: false,
                data: "scrape"
            })
        }
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});


/*
This Api for Getting all Mail Subscri for Home screen for App.
This will get Filter subcription(new subscription only), unread Mail Info and total Count
*/
router.post('/readMailInfo', async (req, res) => {
    try {
        const doc = req.token;

        const emailinfos = await GetEmailQuery.getAllFilteredSubscription(doc.user_id);
        const unreademail = await GetEmailQuery.getUnreadEmailData(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        const ecom_data = await SenderEmailModel.find({ senderMail: { $in: ecommerce_cmpany },user_id:doc.user_id });
        let finished = false;
        let is_finished = await BaseController.isScanFinished(doc.user_id);
        if (is_finished && is_finished == "true") {
            console.log("is_finished here-> ", is_finished);
            finished = true;
            BaseController.updateUserByActionKey(doc.user_id, { "last_launch_date": new Date() }).catch(err => {
                console.error(err.message, err.stack, "launch date set error");
            });
        }
        if (is_finished === null) {
            await BaseController.scanFinished(doc.user_id);
        }
        await BaseController.handleRedis(doc.user_id, false);
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
        console.error(err.message, err.stack, "9");
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
        console.error(err.message, err.stack, "10");
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
        console.error(err.message, err.stack, "11");
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
        console.error(err.message, err.stack, "12");
    }
});


/*
This for function for scrapping Inbox for particular user.
This will Get List of email in Batch of 100 for given Time period and will parsed mail.
*/
async function getRecentEmail(user_id, auth, nextPageToken, label, afterFinishCB) {
    let date = new Date(Date.now() - APPROX_TWO_MONTH_IN_MS);
    let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; // "2019/2/1";
    let responseList = await gmail.users.messages.list({ auth: auth, userId: 'me', /*includeSpamTrash: true,*/ maxResults: 100, 'pageToken': nextPageToken, q: `from:* AND after:${formatted_date}` });
    if (responseList && responseList['data']['messages']) {
        await responseList['data']['messages'].asyncForEach(async element => {
            let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': element['id'] });
            if (response) {
                if (response.data.payload || response.data.payload['parts']) {
                    let unsub_url;
                    let header_raw = response['data']['payload']['headers'];
                    header_raw.forEach(async data => {
                        if (data.name == "List-Unsubscribe") {
                            unsub_url = data.value;
                        }
                    })
                    try {
                        if (unsub_url) {
                            await Expensebit.checkEmailWithInscribeHeader(unsub_url, response['data'], user_id, auth);
                        } else {
                            let parsed = getParts(response['data']['payload']) || getPlainText(response['data']['payload'])
                            let bodydata = new Buffer(parsed, 'base64').toString('utf-8')
                            try {
                                // await MailScraper.sendMailToScraper(com.anoop.email.Parser.parse(response['data'], bodydata), user_id);
                            } catch (e) {
                                require('raven').captureException(e);
                            }
                            await Expensebit.checkEmailNew(bodydata, response['data'], user_id, auth, label);
                        }
                    } catch (e) {
                        console.error(e.message, e.stack, "14");
                        return
                    }
                }
            }
        });
    }
    nextPageToken = responseList['data'].nextPageToken;
    if (responseList['data'].nextPageToken) {
        await getRecentEmail(user_id, auth, responseList['data'].nextPageToken, label, afterFinishCB);
    } else {
        afterFinishCB()
    }
}




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
        console.error(err.message, ex.stack, "18");
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
        const from_email = req.body.from_email;
        const doc = req.token;
        var oldvalue = {
            "from_email": from_email,
            "user_id": doc.user_id
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
        console.error(err.message, ex.stack, "21");
    }
});

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

function getPlainText(payload) {
    var str = "";
    var isHtmlTag;
    if (payload.parts) {
        for (var i = 0; i < payload.parts.length; i++) {
            str += getPlainText(payload.parts[i]);
        };
    }
    if (payload.mimeType == "text/plain") {
        return payload["body"]["data"];
    }
    return str;
}

function getParts(payload) {
    var str = "";
    var isHtmlTag;
    if (payload.parts) {
        for (var i = 0; i < payload.parts.length; i++) {
            if (payload.mimeType == "multipart/alternative" && payload.parts[i].mimeType != 'text/html') continue;
            str += getParts(payload.parts[i]);
        };
    } else if ((payload.mimeType == "text/html")) {
        return payload["body"]["data"];
    }
    return str;
}

async function getEmailFromSpecificSender(user_id, auth, nextPageToken, label, sender_email, is_move) {
    let date = new Date(Date.now() - APPROX_TWO_MONTH_IN_MS);
    let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    let responseList = await gmail.users.messages.list({
        auth: auth, userId: 'me', maxResults: 100,
        'pageToken': nextPageToken,
        q: `from:${sender_email} AND after:${formatted_date}`
    });
    if (responseList && responseList['data']['messages']) {
        responseList['data']['messages'].forEach(async element => {
            let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': element['id'] });
            if (response) {
                if (response.data.payload || response.data.payload['parts']) {
                    try {
                        if (is_move) {
                            await Expensebit.manualMoveMail(response['data'], user_id, auth, label);
                        } else {
                            await Expensebit.manualTrashMail(response['data'], user_id, auth, label);
                        }
                    } catch (e) {
                        console.error(e.message, e.stack, "14");
                        return
                    }
                }
            }
        });
    }
    nextPageToken = responseList['data'].nextPageToken;
    if (responseList['data'].nextPageToken) {
        await getEmailFromSpecificSender(user_id, auth, responseList['data'].nextPageToken, label, sender_email, is_move);
    }
}

module.exports = router

