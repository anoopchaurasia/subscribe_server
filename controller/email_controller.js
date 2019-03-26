let express = require('express');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let Request = require("request");
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
const GetEmailQuery = require("../helper/getEmailQuery").GetEmailQuery;
let router = express.Router();
var { google } = require('googleapis');
const simpleParser = require('mailparser').simpleParser;
var gmail = google.gmail('v1');
let DeleteEmail = require("../helper/deleteEmail").DeleteEmail;
let TrashEmail = require("../helper/trashEmail").TrashEmail;

router.post('/deleteMailFromInbox', async (req, res) => {
    console.log(req.body);
    await DeleteEmail.deleteEmails(req.token, req.body);
    res.json({
        error: false,
        data: "moving"
    })
});

router.post('/inboxToTrash', async (req, res) => {
    await TrashEmail.inboxToTrash(req.token, req.body);
    res.status(200).json({
        error: false,
        data: "moving"
    })
});

router.post('/revertTrashMailToInbox', async (req, res) => {
    await TrashEmail.revertMailFromTrash(req.token, req.body);
    res.status(200).json({
        error: false,
        data: "moving"
    })
});


router.post('/moveEmailToExpbit', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let is_unscubscribe = req.body.is_unscubscribe;
        let is_remove_all = req.body.is_remove_all;
        let tokenInfo = req.token;
        if (tokenInfo) {
            let authToken = await TokenHandler.getAccessToken(tokenInfo.user_id).catch(e => console.error(e));
            let oauth2Client = await TokenHandler.createAuthCleint(authToken);
            oauth2Client.credentials = authToken;
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



router.post('/getMailInfo', async (req, res) => {
    try {
        let token = req.token;
        if (token) {
            let authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e));
            let oauth2Client = await TokenHandler.createAuthCleint(authToken);
            Expensebit.createEmailLabel(token.user_id, oauth2Client);
            Expensebit.watchapi(oauth2Client);
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

router.post('/readMailInfo', async (req, res) => {
    try {
        let doc = req.token;
        if (doc) {
            let emailinfos = await GetEmailQuery.getAllFilteredSubscription(doc.user_id);
            let unreademail = await GetEmailQuery.getUnreadEmail(doc.user_id);
            let unreadData = {};
            if (unreademail) {
                unreademail.forEach(async element => {
                    unreadData[element._id.from_email] = element.count
                });
                let total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
                console.log(emailinfos, unreademail, total)
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

router.post('/readProfileInfo', async (req, res) => {
    try {
        let doc = req.token;
        if (doc) {
            let emailinfos = await GetEmailQuery.getAllSubscription(doc.user_id);
            let movedMail = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
            let totalEmail = await GetEmailQuery.getTotalEmailCount(doc.user_id);
            let totalUnscribeEmail = await GetEmailQuery.getTotalUnsubscribeEmailCount(doc.user_id);
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

router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        let doc = req.token;
        if (doc) {
            let emailinfos = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
            let unreademail = await GetEmailQuery.getUnreadMovedEmail(doc.user_id);
            let unreadData = {};
            if (unreademail) {
                unreademail.forEach(async element => {
                    unreadData[element._id.from_email] = element.count
                });
                let total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
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

router.post('/getEmailSubscription', async (req, res) => {
    try {
        let doc = req.token;
        if (doc) {
            let emailinfos = await GetEmailQuery.getAllFilteredSubscription(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos
            })
        }
    } catch (err) {
        console.log(err)
    }
});


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
                    buff = Buffer.from(data, 'base64');
                    text = buff.toString();
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



router.post('/unSubscribeMail', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let mailList = await email.findOne({ "from_email": from_email }).catch(err => {
            console.log(err);
        });
        if (mailList) {
            var settings = {
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

router.post('/getDeletedEmailData', async (req, res) => {
    try {
        let doc = req.token;
        if (doc) {
            let emailinfos = await GetEmailQuery.getAllTrashSubscription(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos
            })
        }
    } catch (err) {
        console.log(err);
    }
});

router.post('/keepMailInformation', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let doc = req.token;
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
            var upsert = {
                upsert: true
            };
            await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
                console.log(err);
            });
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        let doc = req.token;
        if (doc) {
            let emailinfos = await GetEmailQuery.getAllKeepedSubscription(doc.user_id);
            let unreademail = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
            let unreadData = {};
            if (unreademail) {
                unreademail.forEach(async element => {
                    unreadData[element._id.from_email] = element.count
                });
                let total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
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

