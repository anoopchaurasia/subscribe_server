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
const MailScraper = require("../helper/mailScraper").MailScraper;
// var redis = require("redis");
// var RedisClient = redis.createClient();
// RedisClient.on('error', function (err) {
//     console.log('Redis error: ' + err);
// });

// RedisClient.on("ready", function () {
//     console.log("Redis is ready");
// });
const APPROX_TWO_MONTH_IN_MS = 2 * 30 * 24 * 60 * 60 * 1000;
fm.Include("com.anoop.email.Parser");
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
        if (tokenInfo) {
            const authToken = await TokenHandler.getAccessToken(tokenInfo.user_id).catch(e => console.error(e.message, e.stack));
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            await TrashEmail.revertMailFromTrash(tokenInfo.user_id, oauth2Client, req.body);
            res.status(200).json({
                error: false,
                data: "moving"
            })
        }
    } catch (ex) {
        console.error(ex.message, ex.stack);
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
        if (tokenInfo) {
            const authToken = await TokenHandler.getAccessToken(tokenInfo.user_id).catch(e => console.error(e.message, e.stack));
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            await Expensebit.getListLabel(tokenInfo.user_id, oauth2Client, from_email, is_unscubscribe, is_remove_all);
            res.status(200).json({
                error: false,
                data: "moving"
            })
        }
    } catch (ex) {
        console.error(ex.message, ex.stack);
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
            const authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e.message, e.stack));
            // RedisClient.keys(token.user_id + "-*", (err, keylist) => {
            //     if (keylist.length != 0) {
            //         RedisClient.del(keylist, function (err, o) {
            //             console.log(o)
            //         });

            //     }
            // });
            const oauth2Client = await TokenHandler.createAuthCleint(authToken);
            Expensebit.createEmailLabel(token.user_id, oauth2Client);
            await getRecentEmail(token.user_id, oauth2Client, null);
            res.status(200).json({
                error: false,
                data: "scrape"
            })
        }
    } catch (ex) {
        console.error(ex.message, ex.stack);
        res.sendStatus(400);
    }
});

router.post('/getMailListForSender', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            const emailinfos = await GetEmailQuery.getAllMailBasedOnSender(doc.user_id, req.body.from_email);
            res.status(200).json({
                error: false,
                data: emailinfos
            })
        }
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, err.stack);
    }
});



/*
This Api for Getting all Mail Subscri for Home screen for App.
This will get Filter subcription(new subscription only), unread Mail Info and total Count
*/
router.post('/readMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        if (doc) {
            let keylist = await com.anoop.vendor.Redis.getKEYS(doc.user_id + "-*");
            if (keylist.length != 0) {
                console.log(keylist)
                keylist.forEach(async element => {
                    let mail = await com.anoop.vendor.Redis.popData(element);
                    console.log(mail[0])
                    if (mail.length != 0) {
                        var unread = 0;
                        var read = 0;
                        var count = 0;
                        mail.forEach(mailObj => {
                            count++;
                            mailObj = JSON.parse(mailObj);
                            if (mailObj.labelIds.includes("UNREAD")) {
                                unread++;
                            } else {
                                read++;
                            }
                        });
                        console.log((unread * 100) / count, "%")
                        if (count == mail.length && ((unread * 100) / count) > 90) {
                            console.log(element, unread, read)
                            mail.forEach(async mailObj => {
                                await Expensebit.storeEmailInDB(JSON.parse(mailObj), doc.user_id);
                            });
                            await com.anoop.vendor.Redis.delKEY(element);
                        }else{
                            await com.anoop.vendor.Redis.delKEY(element);
                        }
                    }

                    // if(mail){
                    //     console.log(mail)
                    //     var mailData = mail;
                    //     if ((mailData.unread * 100 / (mailData.read + mailData.unread)) > 90) {
                    //         if ((mailData.read + mailData.unread) >= 5) {
                    //             await Expensebit.storeEmailInDB(JSON.parse(mail), doc.user_id);
                    //         }
                    //         await com.anoop.vendor.Redis.delKEY(element);
                    //     } else {
                    //         await com.anoop.vendor.Redis.delKEY(element);
                    //     }
                    // }   
                });
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
        }
    } catch (err) {
        console.error(err.message, err.stack);
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
        console.error(err.message, err.stack);
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

            let unreadData = await GetEmailQuery.getUnreadMovedEmail(doc.user_id);
            if (unreadData) {

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
        console.error(err.message, err.stack);
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
        console.error(err.message, err.stack);
    }
});


/*
This for function for scrapping Inbox for particular user.
This will Get List of email in Batch of 100 for given Time period and will parsed mail.
*/
async function getRecentEmail(user_id, auth, nextPageToken) {
    let date = new Date(Date.now() - APPROX_TWO_MONTH_IN_MS);
    let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; // "2019/2/1";
    let responseList = await gmail.users.messages.list({ auth: auth, userId: 'me', /*includeSpamTrash: true,*/ maxResults: 100, 'pageToken': nextPageToken, q: `from:* AND after:${formatted_date}` });
    if (responseList && responseList['data']['messages']) {
        responseList['data']['messages'].forEach(async element => {
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
                            console.log(unsub_url)
                            await Expensebit.checkEmailWithInscribeHeader(unsub_url, response['data'], user_id, auth);
                        } else {
                            let parsed = getParts(response['data']['payload']) || getPlainText(response['data']['payload'])
                            let bodydata = new Buffer(parsed, 'base64').toString('utf-8')
                            try {
                                await MailScraper.sendMailToScraper(com.anoop.email.Parser.parse(response['data'], bodydata), user_id);
                            } catch (e) {
                                require('raven').captureException(err);
                            }
                            await Expensebit.checkEmailNew(bodydata, response['data'], user_id, auth);
                        }
                    } catch (e) {
                        console.error(e.message, e.stack);
                        return
                    }
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
            console.error(err.message, err.stack);
        });
        if (mailList) {
            const settings = {
                "url": mailList.unsubscribe,
                "method": "get"
            }
            Request(settings, async (error, response, body) => {
                if (error) {
                    return console.error(err.message, err.stack);
                }
            });
        }
    } catch (ex) {
        console.error(ex.message, ex.stack);
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

            let unreadData = await GetEmailQuery.getUnreadTrashEmail(doc.user_id);
            if (unreadData) {

                const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
                res.status(200).json({
                    error: false,
                    data: emailinfos,
                    unreadData: unreadData,
                    totalEmail: total
                })
            }
            // res.status(200).json({
            //     error: false,
            //     data: emailinfos
            // })
        }
    } catch (err) {
        console.error(err.message, ex.stack);
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
                console.error(err.message, err.stack);
            });
        }
        res.sendStatus(200)
    } catch (ex) {
        console.error(ex.message, ex.stack);
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
            let unreadData = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
            if (unreadData) {

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
        console.error(err.message, ex.stack);
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

module.exports = router

