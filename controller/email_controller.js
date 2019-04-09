'use strict'
const express = require('express');
const email = require('../models/email');
const Request = require("request");
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
const GetEmailQuery = require("../helper/getEmailQuery").GetEmailQuery;
const router = express.Router();
const { google } = require('googleapis');
const simpleParser = require('mailparser').simpleParser;
const gmail = google.gmail('v1');
const DeleteEmail = require("../helper/deleteEmail").DeleteEmail;
const TrashEmail = require("../helper/trashEmail").TrashEmail;


/*
This api for deleting mail from Inbox or Trash folder.
*/
router.post('/deleteMailFromInboxx', async (req, res) => {
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
    await TrashEmail.revertMailFromTrash(req.token, req.body);
    res.status(200).json({
        error: false,
        data: "moving"
    })
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
        if (tokenInfo) {
            const authToken = await TokenHandler.getAccessToken(tokenInfo.user_id).catch(e => console.error(e));
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            await Expensebit.getListLabel(tokenInfo.user_id, oauth2Client, from_email, is_unscubscribe, is_remove_all);
            res.status(200).json({
                error: false,
                data: "moving"
            })
        }
    } catch (ex) {
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
            const authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e));
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            Expensebit.createEmailLabel(token.user_id, oauth2Client);
            await getRecentEmail(token.user_id, oauth2Client, null);
            res.status(200).json({
                error: false,
                data: "scrape"
            })
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

/*
This Api for Getting all Mail Subscription for Home screen for App.
This will get Filter subcription(new subscription only), unread Mail Info and total Count
*/
router.post('/readMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            const emailinfos = await GetEmailQuery.getAllFilteredSubscription(doc.user_id);
            const unreademail = await GetEmailQuery.getUnreadEmail(doc.user_id);
            let unreadData = {};
            if (unreademail) {
                unreademail.forEach(async element => {
                    unreadData[element._id.from_email] = element.count
                });
                const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    unreadData: unreadData,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        console.log(err);
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
        if (doc) {
            const emailinfos = await GetEmailQuery.getAllSubscription(doc.user_id);
            const movedMail = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
            const totalEmail = await GetEmailQuery.getTotalEmailCount(doc.user_id);
            const totalUnscribeEmail = await GetEmailQuery.getTotalUnsubscribeEmailCount(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos,
                moveMail: movedMail,
                totalEmail: totalEmail,
                totalUnscribeEmail: totalUnscribeEmail
            })
        }
    } catch (err) {
        console.log(err);
    }
});

/*
This api will get All unsubscribe Subscription Related Information.
*/
router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            const emailinfos = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
            const unreademail = await GetEmailQuery.getUnreadMovedEmail(doc.user_id);
            let unreadData = {};
            if (unreademail) {
                unreademail.forEach(async element => {
                    unreadData[element._id.from_email] = element.count
                });
                const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    unreadData: unreadData,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        console.log(err)
    }
});


/*
This api will get Filer subsciption(new only).
*/
router.post('/getEmailSubscription', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            const emailinfos = await GetEmailQuery.getAllFilteredSubscription(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos
            })
        }
    } catch (err) {
        console.log(err)
    }
});


/*
This for function for scrapping Inbox for particular user.
This will Get List of email in Batch of 100 for given Time period and will parsed mail.
*/
async function getRecentEmail(user_id, auth, nextPageToken) {
    let responseList = await gmail.users.messages.list({ auth: auth, userId: 'me', includeSpamTrash: true, maxResults: 100, 'pageToken': nextPageToken, q: 'from:* AND after:2019/02/01 ' });
    if (responseList && responseList['data']['messages']) {
        responseList['data']['messages'].forEach(async element => {
            let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': element['id'] });
            if (response) {
                if (response.data.payload || response.data.payload['parts']) {
                    let message_raw = response.data.payload['parts'] == undefined ? response.data.payload.body.data
                        : response.data.payload.parts[0].body.data;
                    let data = message_raw;
                    let buff = Buffer.from(data, 'base64');
                    let text = buff.toString();
                    simpleParser(text, async (err, parsed) => {
                        if (parsed) {
                            if (parsed['text']) {
                                await Expensebit.checkEmail(parsed['text'], response['data'], user_id, auth);
                            }
                            if (parsed['headerLines']) {
                                await Expensebit.checkEmail(parsed.headerLines[0].line, response['data'], user_id, auth);
                            }
                            if (parsed['textAsHtml']) {
                                await Expensebit.checkEmail(parsed['textAsHtml'], response['data'], user_id, auth);
                            }
                        }
                    });
                }
            }
        });
    }
    nextPageToken = responseList['data'].nextPageToken;
    if (responseList['data'].nextPageToken) {
        await getRecentEmail(user_id, auth, responseList['data'].nextPageToken);
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
            console.log(err);
        });
        if (mailList) {
            const settings = {
                "url": mailList.unsubscribe,
                "method": "get"
            }
            Request(settings, async (error, response, body) => {
                if (error) {
                    return console.log(error);
                }
            });
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});


/*
This api for getting only trash suscription information.
*/
router.post('/getDeletedEmailData', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            const emailinfos = await GetEmailQuery.getAllTrashSubscription(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos
            })
        }
    } catch (err) {
        console.log(err);
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
        if (doc) {
            var oldvalue = {
                user_id: doc.user_id,
                "from_email": from_email
            };
            var newvalues = {
                $set: {
                    "is_keeped": true
                }
            };
            await email.updateMany(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.log(err);
            });
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});


/*
This Api for getting only keeped subscription Information.
*/
router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            const emailinfos = await GetEmailQuery.getAllKeepedSubscription(doc.user_id);
            const unreademail = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
            let unreadData = {};
            if (unreademail) {
                unreademail.forEach(async element => {
                    unreadData[element._id.from_email] = element.count
                });
                const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    unreadData: unreadData,
                    totalEmail: total
                })
            }
        }
    } catch (err) {
        console.log(err);
    }
});


module.exports = router

