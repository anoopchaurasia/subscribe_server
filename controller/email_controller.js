var fs = require('fs');
let express = require('express');
let auth_token = require('../models/authToken');
let email = require('../models/email');
let token_model = require('../models/token');
let Request = require("request");
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
let router = express.Router();
var { google } = require('googleapis');
const cheerio = require('cheerio');
const simpleParser = require('mailparser').simpleParser;
var gmail = google.gmail('v1');
let DeleteEmail = require("../helper/deleteEmail").DeleteEmail;
let TrashEmail = require("../helper/trashEmail").default;

router.post('/deleteMailFromInbox', async (req, res) => {
    console.log(req.body);
    await DeleteEmail.deleteEmails(req.token, { from_email}=req.body);
    res.json({
        error: false,
        data: "moving"
    })
});

router.post('/inboxToTrash', async (req, res) => {
    await TrashEmail.inboxToTrash(req.token, {from_email}=req.body);
    res.status(200).json({
        error: false,
        data: "moving"
    })
});

router.post('/trashToInbox', async (req, res) => {
    await TrashEmail.revertMailFromTrash(req.token, {from_email}=req.body);
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

let watchapi = async(oauth2Client) => {
    var options = {
        userId: 'me',
        auth: oauth2Client,
        resource: {
            labelIds: ["INBOX", "CATEGORY_PROMOTIONS", "UNREAD"],
            topicName: 'projects/retail-1083/topics/subscribeMail'
        }
    };
    console.log("watch api called")
    await gmail.users.watch(options);
}



router.post('/getMailInfo', async (req, res) => {
    try {
        console.log("scrap called")
        let token = req.token;
        console.log(token)
        if (token) {
            console.log(token.user_id)
            let authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e));
            console.log(authToken)
            let oauth2Client = await TokenHandler.createAuthCleint(authToken);
            // oauth2Client.credentials = authToken;
            console.log(oauth2Client)
            createEmailLabel(token.user_id, oauth2Client);
            watchapi(oauth2Client);
            let mailData = await getRecentEmail(token.user_id, oauth2Client, null);
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
            let emailinfos = await email.aggregate([{ $match: { "is_trash":false, "is_moved": false, "is_keeped": false,"is_delete":false, "user_id": doc.user_id } }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "url": "$unsubscribe",
                            "email_id": "$email_id",
                            "history_id": "$historyId",
                            "from_email_name": "$from_email_name"
                        }
                    }, count: { $sum: 1 }
                }
            }, { $sort: { "count": -1 } }, { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
                console.log(err);
            });
            if (emailinfos) {
                let unreademail = await email.aggregate([{ $match: { $text: { $search: "UNREAD" },"is_trash":false, "is_keeped": false, "is_moved": false, "user_id": doc.user_id } },
                { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
                { $project: { "count": 1 } }]).catch(err => {
                    console.log(err);
                });
                let unreadData = {};
                if (unreademail) {
                    unreademail.forEach(element => {
                        unreadData[element._id.from_email] = element.count
                    });
                    let allEmail = await email.find({ 'user_id': doc.user_id }).catch(err => {
                        console.log(err);
                    });
                    if (allEmail) {
                        res.status(200).json({
                            error: false,
                            data: emailinfos,
                            unreadData: unreadData,
                            totalEmail: allEmail.length
                        })
                    }
                }
            }
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(400);
    }
});

router.post('/readProfileInfo', async (req, res) => {
    try {
        let doc =req.token;
        if (doc) {
            let emailinfos = await email.aggregate([{ $match: { "user_id": doc.user_id } }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "url": "$unsubscribe",
                            "email_id": "$email_id",
                            "history_id": "$historyId",
                            "from_email_name": "$from_email_name"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
                console.log(err);
            });
            if (emailinfos) {
                let movedMail = await email.aggregate([{ $match: { "is_moved": true, "is_delete": false, "is_keeped": false, "user_id": doc.user_id } }, {
                    $group: {
                        _id: { "from_email": "$from_email" }, data: {
                            $push: {
                                "labelIds": "$labelIds",
                                "subject": "$subject",
                                "url": "$unsubscribe",
                                "email_id": "$email_id",
                                "history_id": "$historyId",
                                "from_email_name": "$from_email_name"
                            }
                        }, count: { $sum: 1 }
                    }
                },
                { $sort: { "count": -1 } },
                { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
                    console.log(err);
                });
                
                if (movedMail) {
                    let totalEmail = await email.find({ "user_id": doc.user_id }).catch(err => {
                        console.log(err);
                    });;
                    if(totalEmail){
                        let totalUnscribeEmail = await email.find({ "user_id": doc.user_id , "is_moved": true,"is_delete":false,"is_keeped":false }).catch(err => {
                            console.log(err);
                        });
                        console.log(totalUnscribeEmail)
                        res.status(200).json({
                            error: false,
                            data: emailinfos,
                            moveMail: movedMail,
                            totalEmail: totalEmail.length,
                            totalUnscribeEmail: totalUnscribeEmail.length
                        })
                    }
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
});

router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        let doc = req.token;
        if (doc) {
            let emailinfos = await email.aggregate([{ $match: { "is_moved": true, "is_keeped": false, "user_id": doc.user_id } }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "url": "$unsubscribe",
                            "email_id": "$email_id",
                            "history_id": "$historyId",
                            "from_email_name": "$from_email_name"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
                console.log(err);
            });
            if (emailinfos) {
                let unreademail = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "is_keeped": false, "is_moved": true, "user_id": doc.user_id } },
                { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
                { $project: { "count": 1 } }]).catch(err => {
                    console.log(err);
                });
                let unreadData = {};
                if (unreademail) {
                    unreademail.forEach(element => {
                        unreadData[element._id.from_email] = element.count
                    });
                    let allEmail = await email.find({ 'user_id': doc.user_id }).catch(err => {
                        console.log(err);
                    });
                    if (allEmail) {
                        res.status(200).json({
                            error: false,
                            data: emailinfos,
                            unreadData: unreadData,
                            totalEmail: allEmail.length
                        })
                    }
                }
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
            let emailinfos = await email.aggregate([{ $match: { "is_trash": false,"is_moved": false,"is_delete":false,"is_keeped":false,  "user_id": doc.user_id } }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "url": "$unsubscribe",
                            "email_id": "$email_id",
                            "history_id": "$historyId",
                            "from_email_name": "$from_email_name"
                        }
                    }, count: { $sum: 1 }
                }
            },
                { $sort: { "count": -1 } },
                { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
                console.log(err);
            });
            if (emailinfos) {
                res.status(200).json({
                    error: false,
                    data: emailinfos
                })
            }
        }
    } catch (err) {
        console.log(err)
    }
});

async function createEmailLabel(user_id, auth) {
    console.log("label clalled")
    const gmail = google.gmail({ version: 'v1', auth })
    let res = await gmail.users.labels.create({
        userId: 'me',
        resource: {
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
            "name": "Unsubscribed Emails"
        }
    });
    if (res) {
        var oldvalue = {
            user_id: user_id
        };
        var newvalues = {
            $set: {
                "label_id": res.data.id
            }
        };
        var upsert = {
            upsert: true
        };
        await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
            console.log(err);
        });
    }
}

async function getRecentEmail(user_id, auth, nextPageToken) {
    console.log("recent mail scrape")
    let responseList = await gmail.users.messages.list({ auth: auth, userId: 'me', includeSpamTrash: true, maxResults: 100, 'pageToken': nextPageToken, q: 'from:* AND after:2019/02/01 ' });
    if (responseList && responseList['data']['messages']) {
        responseList['data']['messages'].forEach(async element => {
            let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': element['id'] });
            if (response) {
                let header_raw = response['data']['payload']['headers'];
                let head;
                header_raw.forEach(data => {
                    if (data.name === "Subject") {
                        head = data.value
                    }
                });
                if (response.data.payload || response.data.payload['parts']) {
                    let message_raw = response.data.payload['parts'] == undefined ? response.data.payload.body.data
                        : response.data.payload.parts[0].body.data;
                    let data = message_raw;
                    buff = Buffer.from(data, 'base64');
                    text = buff.toString();
                    simpleParser(text, async (err, parsed) => {
                        if (parsed) {
                            if (parsed['text']) {
                                await Expensebit.checkEmail(parsed['text'], response['data'], user_id,auth);
                            }
                            if (parsed['headerLines']) {
                                await Expensebit.checkEmail(parsed.headerLines[0].line, response['data'], user_id,auth);
                            }
                            if (parsed['textAsHtml']) {
                                await Expensebit.checkEmail(parsed['textAsHtml'], response['data'], user_id,auth);
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
            console.log(settings);
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
        console.log(doc)
        if (doc) {
            let emailinfos = await email.aggregate([{ $match: { $text: { $search: "TRASH" }, "is_delete": false, "user_id": doc.user_id } }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "url": "$unsubscribe",
                            "email_id": "$email_id",
                            "history_id": "$historyId",
                            "from_email_name": "$from_email_name"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
                console.log(err);
            });
            console.log(emailinfos)
            if (emailinfos) {
                res.status(200).json({
                    error: false,
                    data: emailinfos
                })
            }
        }
    } catch (err) {
        console.log(err)
    }
});

router.post('/keepMailInformation', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
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
            let emailinfos = await email.aggregate([{ $match: { "is_keeped": true, "user_id": doc.user_id } }, {
                $group: {
                    _id: { "from_email": "$from_email" }, data: {
                        $push: {
                            "labelIds": "$labelIds",
                            "subject": "$subject",
                            "url": "$unsubscribe",
                            "email_id": "$email_id",
                            "history_id": "$historyId",
                            "from_email_name": "$from_email_name"
                        }
                    }, count: { $sum: 1 }
                }
            },
            { $sort: { "count": -1 } },
            { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
                console.log(err);
            });
            if (emailinfos) {
                let unreademail = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "is_keeped": false, "is_moved": true, "user_id": doc.user_id } },
                { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
                { $project: { "count": 1 } }]).catch(err => {
                    console.log(err);
                });
                let unreadData = {};
                if (unreademail) {
                    unreademail.forEach(element => {
                        unreadData[element._id.from_email] = element.count
                    });
                    let allEmail = await email.find({ 'user_id': doc.user_id }).catch(err => {
                        console.log(err);
                    });
                    if (allEmail) {
                        res.status(200).json({
                            error: false,
                            data: emailinfos,
                            unreadData: unreadData,
                            totalEmail: allEmail.length
                        })
                    }
                }
            }
        }
    } catch (err) {
        console.log(err)
    }
});


module.exports = router

