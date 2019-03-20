var fs = require('fs');
let express = require('express');
let auth_token = require('../models/authToken');
let TokenHandler = require("../helper/TokenHandler").TokenHandler;
let email = require('../models/email');
let token_model = require('../models/token');
let Request = require("request");
let router = express.Router();
var { google } = require('googleapis');
const cheerio = require('cheerio');
const simpleParser = require('mailparser').simpleParser;
var gmail = google.gmail('v1');

router.post('/deleteMailFromInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let emailIDS = req.body.emailIDS;
        await checkTokenLifetime(req.token, from_email, emailIDS, false);
        res.status(200).json({
            error: false,
            data: "moving"
        })
          
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        let from_email = req.body.from_email;
        let emailIDS = req.body.emailIDS;
        await checkTokenLifetime(req.token, from_email, emailIDS, true);
        res.status(200).json({
            error: false,
            data: "moving"
        })
           
    } catch (ex) {
        res.sendStatus(400);
    }
});


router.post('/moveEmailToExpbit', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let is_unscubscribe = req.body.is_unscubscribe;
        let is_remove_all = req.body.is_remove_all;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                await check_Token_info(doc.user_id, tokenInfo, from_email, tokenInfo.label_id, is_unscubscribe, is_remove_all);
                res.status(200).json({
                    error: false,
                    data: "moving"
                })
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});


router.post('/checkLabelInformation', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                await getLabelFromEmail(doc.user_id, tokenInfo, tokenInfo.label_id)
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
})

let getLabelFromEmail = async (user_id, token, from_email, label_id, is_unscubscribe, is_remove_all) => {
    fs.readFile('./client_secret.json',
        async function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            let credentials = JSON.parse(content);
            let clientSecret = credentials.installed.client_secret;
            let clientId = credentials.installed.client_id;
            let redirectUrl = credentials.installed.redirect_uris[0];
            let OAuth2 = google.auth.OAuth2;
            let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
            oauth2Client.credentials = token;
            await getListLabel(user_id, oauth2Client, from_email, is_unscubscribe, is_remove_all);
        });
}

let watchapi = async (user_id, oauth2Client) => {
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


let getListLabel = async (user_id, auth, from_email, is_unscubscribe, is_remove_all) => {
    const gmail = google.gmail({ version: 'v1', auth });
    let res = await gmail.users.labels.list({
        userId: 'me',
    });
    if (res) {
        let lbl_id = null;
        res.data.labels.forEach(lbl => {
            if (lbl.name === "Unsubscribed Emails") {
                lbl_id = lbl.id;
            }
        });
        if (lbl_id == null) {
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
                let result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                    console.log(err);
                });
                if (result) {
                    // let watch = await watchapi(user_id, auth);
                    if (is_remove_all) {
                        await MoveAllMailFromInBOX(user_id, auth, from_email, res.data.id);
                    } else if (is_unscubscribe) {
                        await MoveMailFromExpenseBit(user_id, auth, from_email, res.data.id);
                    } else {
                        await MoveMailFromInBOX(user_id, auth, from_email, res.data.id);
                    }
                }
            }
        } else {
            var oldvalue = {
                user_id: user_id
            };
            var newvalues = {
                $set: {
                    "label_id": lbl_id
                }
            };
            var upsert = {
                upsert: true
            };
            let result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                console.log(err);
            })
            if (result) {
                if (is_remove_all) {
                    await MoveAllMailFromInBOX(user_id, auth, from_email, lbl_id);
                } else if (is_unscubscribe) {
                    await MoveMailFromExpenseBit(user_id, auth, from_email, lbl_id);
                } else {
                    await MoveMailFromInBOX(user_id, auth, from_email, lbl_id);
                }
            }
        }
    }
}


router.post('/getMailInfo', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                await extract_token(doc.user_id, tokenInfo);
                res.status(200).json({
                    error: false,
                    data: "scrape"
                })
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});



router.post('/readMailInfo', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
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
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
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
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
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
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
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



let getMailInfo = async (user_id, token) => {
    fs.readFile('./client_secret.json',
        async function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            let credentials = JSON.parse(content);
            let clientSecret = credentials.installed.client_secret;
            let clientId = credentials.installed.client_id;
            let redirectUrl = credentials.installed.redirect_uris[0];

            let OAuth2 = google.auth.OAuth2;
            let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
            var myDate = new Date(token.expiry_date);
            var mili = myDate.getTime();
            let tokenadd = {
                access_token: token.access_token,
                token_type: token.token_type,
                refresh_token: token.refresh_token,
                expiry_date: mili
            }
            oauth2Client.credentials = tokenadd;
            createEmailLabel(user_id, oauth2Client);
            await watchapi(user_id, oauth2Client);
            let mailData = await getRecentEmail(user_id, oauth2Client, null);
            if (mailData) {
                return mailData;
            }
        }
    );
}



async function MoveMailFromExpenseBit(user_id, auth, from_email, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    let mailList = await email.find({ "from_email": from_email }).catch(err => {
        console.log(err);
    });
    if (mailList) {
        let allLabels = [];
        let mailLBL = [];
        if (mailList[0].labelIds) {
            mailLBL = mailList[0].labelIds.split(",");
        }
        mailLBL.forEach(lblmail => {
            if (lblmail != label) {
                allLabels.push(lblmail);
            }
        });
        var oldvalue = {
            user_id: user_id,
            "from_email": from_email,
            "is_moved": true
        };
        var newvalues = {
            $set: {
                "is_moved": false
            }
        };
        var upsert = {
            upsert: true
        };
        await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
            console.log(err);
        });
        let labelarry = [];
        labelarry[0] = label;
        console.log(allLabels)
        console.log(labelarry)
        mailList.forEach(async oneEmail => {
            if (oneEmail.email_id) {
                let res = await gmail.users.messages.modify({
                    userId: 'me',
                    'id': oneEmail.email_id,
                    resource: {
                        'addLabelIds': allLabels,
                        "removeLabelIds": labelarry
                    }
                });
                await gmail.users.messages.modify({
                        userId: 'me',
                        'id': oneEmail.email_id,
                        resource: {
                            "addLabelIds": ['INBOX']
                        }
                    });
            }
        });
    }
}


async function MoveAllMailFromInBOX(user_id, auth, from_email, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    let mailList = await email.find({ "user_id": user_id, "is_moved": false }).catch(err => {
        console.log(err);
    });
    if (mailList) {
        var oldvalue = {
            user_id: user_id,
            "is_moved": false
        };
        var newvalues = {
            $set: {
                "is_moved": true
            }
        };
        var upsert = {
            upsert: true
        };
        await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
            console.log(err);
        });
        let labelarry = [];
        labelarry[0] = label;
        mailList.forEach(async oneEmail => {
            if (oneEmail.email_id) {
                await gmail.users.messages.modify({
                    userId: 'me',
                    'id': oneEmail.email_id,
                    resource: {
                        'addLabelIds': labelarry,
                        // "removeLabelIds": oneEmail.main_label
                    }
                });
                sleep(2000);
            }
        });
    }
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function MoveMailFromInBOX(user_id, auth, from_email, label) {
    const gmail = google.gmail({ version: 'v1', auth });
    let mailList = await email.find({ "from_email": from_email, "user_id": user_id }).catch(err => {
        console.log(err);
    });
    if (mailList) {
        let allLabels = [];
        let mailLBL = mailList[0].labelIds.split(",");
        mailLBL.forEach(lblmail => {
            if (lblmail != label) {
                allLabels.push(lblmail);
            }
        });

        let labelarry = [];
        labelarry[0] = label;
        console.log("here got labels", allLabels)
        let mailIDSARRAY = [];
        for (let i = 0; i < mailList.length; i++) {
            var oldvalue = {
                "email_id": mailList[i].email_id
            };
            var newvalues = {
                $set: {
                    "is_moved": true,
                    "is_keeped": false
                }
            };
            var upsert = {
                upsert: true
            };
            email.findOneAndUpdate(oldvalue, newvalues, upsert).catch(err => {
                console.log(err);
            });
            mailIDSARRAY.push(mailList[i].email_id);
        }
        console.log(mailIDSARRAY)
        if (mailIDSARRAY.length != 0) {
            if (allLabels.indexOf("INBOX") > -1) {
                await gmail.users.messages.batchModify({
                    userId: 'me',
                    resource: {
                        'ids': mailIDSARRAY,
                        'addLabelIds': labelarry,
                        "removeLabelIds": ['INBOX']
                    }
                });
            } else {
                await gmail.users.messages.batchModify({
                    userId: 'me',
                    resource: {
                        'ids': mailIDSARRAY,
                        'addLabelIds': labelarry,
                        "removeLabelIds": allLabels
                    }
                });
            }
        }
        // mailList.forEach(async oneEmail => {
        //     var oldvalue = {
        //     "email_id": oneEmail.email_id
        //       };
        //         var newvalues = {
        //             $set: {
        //                 "is_moved": true,
        //                 "is_keeped": false
        //             }
        //         };
        //         var upsert = {
        //             upsert: true
        //         };
        //         let data = await email.findOneAndUpdate(oldvalue, newvalues, upsert).catch(err => {
        //             console.log(err);
        //         });
        //             if (oneEmail.email_id) {
        //                 if(allLabels.indexOf("INBOX") > -1){
        //                     await gmail.users.messages.batchModify({
        //                         userId: 'me',
        //                         'id': oneEmail.email_id,
        //                         resource: {
        //                             'addLabelIds': labelarry,
        //                             "removeLabelIds": ['INBOX']
        //                         }
        //                     });
        //                 }else{
        //                     await gmail.users.messages.batchModify({
        //                         userId: 'me',
        //                         'id': oneEmail.email_id,
        //                         resource: {
        //                             'addLabelIds': labelarry,
        //                             "removeLabelIds": allLabels
        //                         }
        //                     });
        //                 }

        //             }
        // });
    }
}

async function createEmailLabel(user_id, auth) {
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

/**
 * Get the recent email from your Gmail account
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getRecentEmail(user_id, auth, nextPageToken) {
    // from: notify@* OR notifications@* OR notifier@* AND after: 2018 / 01 / 24 
    //notify@* OR notifications@* OR notifier@* OR hello@* OR no-replay@* OR start@* OR support@* OR *-noreply@* )
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
                                await checkEmail(parsed['text'], response['data'], user_id,auth);
                            }
                            if (parsed['headerLines']) {
                                await checkEmail(parsed.headerLines[0].line, response['data'], user_id,auth);
                            }
                            if (parsed['textAsHtml']) {
                                await checkEmail(parsed['textAsHtml'], response['data'], user_id,auth);
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

let checkEmail = async (emailObj, mail, user_id,auth) => {
    $ = cheerio.load(emailObj);
    let url = null;
    let emailInfo = {};
    $('a').each(function (i, elem) {
        let fa = $(this).text();
        let anchortext = fa.toLowerCase();
        let anchorParentText = $(this).parent().text().toLowerCase();
        if (anchortext.indexOf("unsubscribe") != -1 ||
            anchortext.indexOf("preferences") != -1 ||
            anchortext.indexOf("subscription") != -1 ||
            anchortext.indexOf("visit this link") != -1 ||
            anchortext.indexOf("do not wish to receive our mails") != -1 ||
            anchortext.indexOf("not receiving our emails") != -1)
        {
            
                url = $(this).attr().href;
                console.log(url);

        }else if(anchorParentText.indexOf("not receiving our emails") != -1 ||
            anchorParentText.indexOf("stop receiving emails") != -1 ||
            anchorParentText.indexOf("unsubscribe") != -1 ||
            anchorParentText.indexOf("subscription") != -1 ||
            anchorParentText.indexOf("preferences") != -1 ||
            anchorParentText.indexOf("mailing list") != -1 ||
            (anchortext.indexOf("click here") != -1 && anchorParentText.indexOf("mailing list") != -1) ||
            ((anchortext.indexOf("here") != -1 || anchortext.indexOf("click here") != -1) && anchorParentText.indexOf("unsubscribe") != -1) ||
            anchorParentText.indexOf("Don't want this") != -1) 
        {
            url = $(this).attr().href;
            console.log(url)
        }
    })
    if (url != null) {
        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = mail
        emailInfo['email_id'] = mail.id;
        emailInfo['historyId'] = mail.historyId;
        emailInfo['labelIds'] = mail.labelIds;
        emailInfo['unsubscribe'] = url;
        emailInfo['main_label'] = mail.labelIds;
        emailInfo['is_moved'] = false;
        emailInfo['is_delete'] = false;
        emailInfo['is_keeped'] = false;
        if(mail.labelIds.indexOf("TRASH") !=-1){
            emailInfo['is_trash']= true;
        }else{
            emailInfo['is_trash'] = false;
        }
        header_raw = mail['payload']['headers']
        header_raw.forEach(data => {
            if (data.name == "From") {
                let from_data = data.value.indexOf("<") != -1 ? data.value.split("<")[1].replace(">", "") : data.value;
                emailInfo['from_email_name'] = data.value;
                emailInfo['from_email'] = from_data;
            } else if (data.name == "To") {
                emailInfo['to_email'] = data.value;
            } else if (data.name == "Subject") {
                emailInfo['subject'] = data.value;
            }
        });
        if(emailInfo.from_email.toLowerCase().indexOf('@gmail')!=-1){
            console.log(emailInfo.from_email)
        }else{
            try {
                let doc = await email.findOne({ "email_id": emailInfo.email_id, "user_id": user_id }).catch(err => {
                    console.log(err);
                });
                if (!doc) {
                    let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true, "user_id":user_id }).catch(err => {
                        console.log(err);
                    });
                    console.log(mailList)
                    if (mailList && mailList.is_moved) {
                        console.log("successfully moved to folder unscribe");
                        emailInfo.is_moved = true;
                        let docInfo = await email.findOneAndUpdate({ "email_id": emailInfo.email_id, "user_id":user_id }, emailInfo, { upsert: true }).catch(err => {
                            console.log(err);
                        });
                        console.log(docInfo)
                        await getListLabel(user_id, auth, mailList)
                    }
                    
                    if (!mailList) {
                        emailInfo.is_moved = false;
                        let docInfo = await email.findOneAndUpdate({ "email_id": emailInfo.email_id, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
                            console.log(err);
                        });
                        console.log(docInfo)
                    }
                }
            } catch (err) {
                console.log(err);
            }
        }
    }
}




async function check_Token_info(user_id, tokenInfo, from_email, label, is_unscubscribe, is_remove_all) {
    if (new Date(tokenInfo.expiry_date) >= new Date()) {
        await getLabelFromEmail(user_id, tokenInfo, from_email, label, is_unscubscribe, is_remove_all);
    } else {
        let content = await fs.readFileSync('./client_secret.json');
        let cred = JSON.parse(content);
        let clientSecret = cred.installed.client_secret;
        let clientId = cred.installed.client_id;
        var body = JSON.stringify({
            "client_id": clientId,
            "client_secret": clientSecret,
            "refresh_token": tokenInfo.refresh_token,
            "grant_type": 'refresh_token'
        });
        var settings = {
            "url": "https://www.googleapis.com/oauth2/v4/token",
            "method": "POST",
            body: body,
            "headers": {
                'Content-Type': 'application/json',
            }
        }

        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                body = JSON.parse(body);
                let milisec = new Date().getTime();
                milisec = milisec + (body.expires_in * 1000);
                tokenInfo.accessToken = body.access_token;
                tokenInfo.expiry_date = new Date(milisec);
                var oldvalue = {
                    user_id: user_id
                };
                var newvalues = {
                    $set: {
                        access_token: body.access_token,
                        expiry_date: new Date(milisec)
                    }
                };
                var upsert = {
                    upsert: true
                };
                let result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                    console.log(err);
                });
                if (result) {
                    await getLabelFromEmail(user_id, tokenInfo, from_email, label, is_unscubscribe, is_remove_all);
                }
            }
        });
    }
}

async function extract_token(user_id, tokenInfo) {
    if (tokenInfo.expiry_date >= new Date()) {
        tokenInfo.expiry_date = tokenInfo.expiry_date.getTime();
        let mailData = await getMailInfo(user_id, tokenInfo).catch(err => {
            console.log(err);
        });
        if (mailData) {
            return mailData;
        }
    } else {
        console.log("expire")
        let content = await fs.readFileSync('./client_secret.json');
        let cred = JSON.parse(content);
        let clientSecret = cred.installed.client_secret;
        let clientId = cred.installed.client_id;
        var body = JSON.stringify({
            "client_id": clientId,
            "client_secret": clientSecret,
            "refresh_token": tokenInfo.refresh_token,
            "grant_type": 'refresh_token',
        });


        var settings = {
            "url": "https://www.googleapis.com/oauth2/v4/token",
            "method": "POST",
            body: body,
            "headers": {
                'Content-Type': 'application/json',
                "access_type": 'offline'
            }
        }

        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                body = JSON.parse(body);
                console.log(body);
                let milisec = new Date().getTime();
                milisec = milisec + (body.expires_in * 1000);
                tokenInfo.access_token = body.access_token;
                tokenInfo.expiry_date = new Date(milisec);
                var oldvalue = {
                    user_id: user_id
                };
                var newvalues = {
                    $set: {
                        access_token: body.access_token,
                        expiry_date: new Date(milisec)
                    }
                };
                var upsert = {
                    upsert: true
                };
                let result = await auth_token.updateOne(oldvalue, newvalues, upsert).catch(err => {
                    console.log(err);
                });
                if (result) {
                    let mailData = await getMailInfo(user_id, tokenInfo);
                    if (mailData) {
                        return mailData;
                    }
                }
            }
        });
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
                if (response) {
                    console.log(response);
                }
                if (body) {
                    console.log(body);
                }
            });
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

async function checkTokenLifetime(deviceToken, from_email, emailIDS, is_revert_from_trash) {
    let authToken = await TokenHandler.getAccessToken(deviceToken.userId).catch(e=> console.error(e));
    let oauth2Client = await TokenHandler.createAuthCleint();
    oauth2Client.credentials = authToken;
    if (is_revert_from_trash) {
        let mail = await revertMailFromTrash(user_id, oauth2Client, from_email, emailIDS);
    } else {
        let mail = await deleteAllEmailsAndMoveToTrash(user_id, oauth2Client, from_email, emailIDS);
    }
}

async function revertMailFromTrash(user_id, auth, from_email, emailIDS) {
    const gmail = google.gmail({ version: 'v1', auth });
    console.log("Trash To INBOX")
    let mailList = await email.find({ "from_email": from_email }).catch(err => {
        console.log(err);
    });
    if (mailList) {
        let mailIds = [];
        let newLable =[];
        let  mailLBL = mailList[0].labelIds.split(",");
        mailLBL.forEach(lblmail => {
            if (lblmail != "TRASH") {
                newLable.push(lblmail);
            }
        });
        mailList.forEach(email => {
            mailIds.push(email.email_id);
        });
        var oldvalue = {
            user_id: user_id,
            "from_email": from_email,
            "is_delete": false
        };
        var newvalues = {
            $set: {
                "labelIds": newLable,
                "is_trash": false
            }
        };
        var upsert = {
            upsert: true
        };
        let result = await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
            console.log(err);
        });
        console.log(result)
        let allLabels = ["TRASH"];
        mailIds.forEach(async mailid => {
            var res = await gmail.users.messages.untrash({
                userId: 'me',
                'id': mailid
            }).catch(err => {
                console.log(err);
            });
        });
    }
}
async function deleteAllEmailsAndMoveToTrash(user_id, auth, from_email, emailIDS) {
    const gmail = google.gmail({ version: 'v1', auth });
    console.log(emailIDS)
    console.log(from_email)
    if (emailIDS && emailIDS.length != 0) {
        var upsert = {
            upsert: true
        };
        emailIDS.forEach(async emid => {
            var oldvalue = {
                user_id: user_id,
                "email_id": emid,
                "is_delete": false
            };
            var newvalues = {
                $set: {
                    "is_delete": true
                }
            };
            await email.updateOne(oldvalue, newvalues, upsert).catch(err => {
                console.log(err);
            });
        });

        emailIDS.forEach(async email_singleid => {
            await gmail.users.messages.delete({
                userId: 'me',
                'id': email_singleid
            }).catch(err => {
                console.log(err);
            });
        });

    } else {
        console.log("move to trash")
        let mailList = await email.find({ "from_email": from_email }).catch(err => {
            console.log(err);
        });
        if (mailList) {
            let mailIds = [];
            let newLable = [];
            let mailLBL = mailList[0].labelIds.split(",");
            mailLBL.forEach(lblmail => {
                if (lblmail != "TRASH") {
                    newLable.push(lblmail);
                }
            });
            newLable.push("TRASH");

            mailList.forEach(email => {
                mailIds.push(email.email_id);
            });
            var oldvalue = {
                user_id: user_id,
                "from_email": from_email,
                "is_delete": false
            };
            var newvalues = {
                $set: {
                    "labelIds": newLable,
                    "is_trash":true
                }
            };
            var upsert = {
                upsert: true
            };
            let result = await email.updateMany(oldvalue, newvalues, upsert).catch(err => {
                console.log(err);
            });
            console.log(result)
            let allLabels = ["TRASH"];
            mailIds.forEach(async mailid => {
                await gmail.users.messages.modify({
                    userId: 'me',
                    'id': mailid,
                    resource: {
                        'addLabelIds': allLabels
                    }
                }).catch(err => {
                    console.log(err);
                });
            });
        }
    }
}



router.post('/getDeletedEmailData', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        console.log(auth_id)
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
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


//implementation in app remaining
router.post('/setMailForDeleteFromInbox', async (req, res) => {
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
                    "set_deleted_at": new Date(new Date().getTime() + (86400 * 1000 * 2))
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
                "from_email": from_email,
                "is_keeped": false
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
        let auth_id = req.body.authID;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
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

