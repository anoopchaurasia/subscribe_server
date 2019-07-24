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
// fm.Include("com.anoop.email.Parser");
fm.Include("com.jeet.memdb.RedisDB");
let RedisDB = com.jeet.memdb.RedisDB;
fm.Include("com.anoop.email.BaseController");
let BaseController = com.anoop.email.BaseController;

Array.prototype.asyncForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i], i, this);
    }
}
/*
This api for deleting mail from Inbox or Trash folder.
*/
router.post('/deleteMailFromTrash', async (req, res) => {
    await DeleteEmail.deleteEmails(req.token, req.body);
    res.json({
        error: false,
        data: "moving"
    })
});


/*
This api for moving Mail from Inbox to Trash Folder.(When swipe Upper)
here We will get Fromemail/sender so using that we are moving all coresponding mail to Trash Folder.
*/
router.post('/deleteMailFromInbox', async (req, res) => {
    await TrashEmail.inboxToTrash(req.token, req.body);
    res.status(200).json({
        error: false,
        data: "moving"
    })
});


/*
Thsi api for Reverting Back Trash Email from Trash folder to Inbox.
*/
router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        const tokenInfo = req.token;
        const authToken = await TokenHandler.getAccessToken(tokenInfo.user_id).catch(e => console.error(e.message, e.stack, "1"));
        const oauth2Client = await TokenHandler.createAuthCleint(authToken);
        await TrashEmail.revertMailFromTrash(tokenInfo.user_id, oauth2Client, req.body);
        res.status(200).json({
            error: false,
            data: "moving"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "2");
        res.sendStatus(400);
    }
});


/*
This api for Moving Email From INbox to SUbscribed Folder.(Whne swipe Left)
*/
router.post('/moveEmailToExpbit', async (req, res) => {
    try {

        const from_email = req.body.from_email;
        const is_unscubscribe = req.body.is_unscubscribe;
        const is_remove_all = req.body.is_remove_all;
        const tokenInfo = req.token;
        const authToken = await TokenHandler.getAccessToken(tokenInfo.user_id).catch(e => console.error(e.message, e.stack, "3"));
        const oauth2Client = await TokenHandler.createAuthCleint(authToken);
        await Expensebit.getListLabel(tokenInfo.user_id, oauth2Client, from_email, is_unscubscribe, is_remove_all);
        res.status(200).json({
            error: false,
            data: "moving"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "4");
        res.sendStatus(400);
    }
});


/*
This Api for Scrapping Mail from INbox.
Based on user Information Email Inbox will be scrape
*/
router.post('/getMailInfo', async (req, res) => {
    try {
        const token = req.token;
        if (token) {
            const authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e.message, e.stack, "5"));
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            Expensebit.createEmailLabel(token.user_id, oauth2Client);
            let label = await Expensebit.findLabelId(oauth2Client);
            getRecentEmail(token.user_id, oauth2Client, null, label, async function afterEnd() {
                let doc = token;
                let keylist = await RedisDB.getKEYS(doc.user_id);
                if (keylist && keylist.length != 0) {
                    keylist.forEach(async element => {
                        let mail = await RedisDB.popData(element);
                        if (mail.length != 0) {
                            let result = await RedisDB.findPercent(mail);
                            if (result) {
                                let from_email_id = await Expensebit.saveAndReturnEmailData(JSON.parse(mail[0]), doc.user_id)
                                await Expensebit.storeBulkEmailInDB(mail, from_email_id);
                            }
                        }
                    });
                    await RedisDB.delKEY(keylist);
                }
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


router.post('/getMailListForSender', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllMailBasedOnSender(doc.user_id, req.body.from_email);
        res.status(200).json({
            error: false,
            data: emailinfos
        })
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, err.stack, "7");
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
        let finished = false;
        let keylist = await RedisDB.getFinishKey("is_finished-" + doc.user_id);
        if (keylist.length != 0) {
            let is_finished = await RedisDB.popData(keylist[0])
            let finish_data = JSON.parse(is_finished[0]);
            console.log("is_finished -> ",finish_data.finish);
            if (is_finished.length != 0 && finish_data.finish){
                console.log("is_finished -> ",finish_data.finish);
                finished = true;
                // await RedisDB.delKEY(keylist);
            }
        } else {
            com.jeet.memdb.RedisDB.pushFlag(doc.user_id,"is_finished", {"finish":true}); 
        }
        await BaseController.handleRedis(doc.user_id, false);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreademail,
            totalEmail: total,
            finished: finished
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
This api for unsubscribing mail from Inbox.
This api Currently not using Its under development.
*/
router.post('/unSubscribeMail', async (req, res) => {
    try {
        const from_email = req.body.from_email;
        const mailList = await email.findOne({ "from_email": from_email }).catch(err => {
            console.error(err.message, err.stack, "15");
        });
        if (mailList) {
            const settings = {
                "url": mailList.unsubscribe,
                "method": "get"
            }
            Request(settings, async (error, response, body) => {
                if (error) {
                    return console.error(err.message, err.stack, "16");
                }
            });
        }
    } catch (ex) {
        console.error(ex.message, ex.stack, "17");
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

