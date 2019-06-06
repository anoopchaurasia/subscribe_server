
let express = require('express');
let users = require('../models/user');
let auth_token = require('../models/authoToken');
let token_model = require('../models/tokeno');
let email = require('../models/emailDetails');
let emailInformation = require('../models/emailInfo');
let router = express.Router();
var uniqid = require('uniqid');
const jwt = require('jsonwebtoken');
const Outlook = require("../helper/outlook").Outlook;
const ExpenseBit = require("../helper/expenseBit").ExpenseBit;
const cheerio = require('cheerio');
var Request = require('request');
Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}
fm.Include("com.jeet.memdb.RedisDB");

const credentials = {
    client: {
        id: process.env.APP_ID,
        secret: process.env.APP_PASSWORD,
    },
    auth: {
        tokenHost: 'https://login.microsoftonline.com',
        authorizePath: 'common/oauth2/v2.0/authorize',
        tokenPath: 'common/oauth2/v2.0/token'
    }
};
const oauth2 = require('simple-oauth2').create(credentials);


router.get('/getOutLookApiUrl', async function (req, res) {
    console.log("came here for url")
    const stateCode = uniqid() + "outlook" + uniqid();
    const returnVal = oauth2.authorizationCode.authorizeURL({
        redirect_uri: process.env.REDIRECT_URI,
        scope: process.env.APP_SCOPES,
        state: stateCode
    });
    var user = new users({
        state: stateCode,
        email: stateCode,
        email_client: "outlook"
    });

    let newUser = await user.save().catch(err => {
        console.log(err);
    });
    res.status(200).json({
        error: false,
        data: returnVal
    })
});


router.post('/getMail', async function (req, resp, next) {
    console.log(req.body)
    let authCode = req.body.authID;
    let userInfo = await token_model.findOne({ token: authCode }).catch(e => console.error(e));
    let token = await auth_token.findOne({ "user_id": userInfo.user_id });
    let accessToken;
    if (token) {
        accessToken = await Outlook.check_Token_info(userInfo.user_id, token);
    }
    if (accessToken) {
        var settings = {
            "url": "https://graph.microsoft.com/v1.0/me/mailFolders",
            "method": "GET",
            "headers": {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }
        Request(settings, async (error, response, body) => {
            if (error) {
                return console.log(error);
            }
            if (body) {
                const res = JSON.parse(body);
                await res.value.asynForEach(async folder => {
                    if (folder.displayName == 'Inbox') {
                        let link = encodeURI('https://graph.microsoft.com/v1.0/me/mailFolders/' + folder.id + '/messages?$skip=0');
                        await getEmailInBulk(accessToken, link, userInfo.user_id);
                    }
                });
                resp.status(200).json({
                    error: false,
                    message: "scrapping"
                })
            }
        });

    } else {
        resp.status(404).json({
            error: false
        })
    }
});

async function getEmailInBulk(accessToken, link, user_id) {
    var settings = {
        "url": link,
        "method": "GET",
        "headers": {
            'Authorization': 'Bearer ' + accessToken
        }
    }

    Request(settings, async (error, response, body) => {
        if (error) {
            return console.log(error);
        }
        if (body) {
            body = JSON.parse(body);
            let mailList = body.value;
            await mailList.asynForEach(async oneEmail => {
                await checkEmail(oneEmail, user_id, accessToken)
            });
            if (body['@odata.nextLink']) {
                await getEmailInBulk(accessToken, encodeURI(body['@odata.nextLink']), user_id);
            }
        }
    });
}


router.post('/moveEmailFromInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await Outlook.check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await Outlook.getFolderList(accessToken, doc.user_id, link, from_email)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertMailToInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await Outlook.check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await Outlook.getRevertMailFolderList(accessToken, doc.user_id, link, from_email, null, null)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await Outlook.check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await Outlook.getRevertTrashMailFolderList(accessToken, doc.user_id, link, from_email, null, null)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});


router.post('/moveEmailToTrashFromInbox', async (req, res) => {
    try {
        let auth_id = req.body.authID;
        let from_email = req.body.from_email;
        let doc = await token_model.findOne({ "token": auth_id }).catch(err => {
            console.log(err);
        });
        if (doc) {
            let tokenInfo = await auth_token.findOne({ "user_id": doc.user_id }).catch(err => {
                console.log(err);
            });
            if (tokenInfo) {
                let accessToken = await Outlook.check_Token_info(doc.user_id, tokenInfo);
                if (accessToken) {
                    let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                    let id = await Outlook.getFolderListForTrash(accessToken, doc.user_id, link, from_email)
                    res.status(200).json({
                        error: false,
                        data: "moving"
                    })
                }
            }
        }
    } catch (ex) {
        res.sendStatus(400);
    }
});

async function createEmailInfo(user_id, url, emailObj) {
    let emailInfo = {};
    emailInfo['user_id'] = user_id;
    emailInfo['mail_data'] = null;
    emailInfo['unsubscribe'] = url;
    emailInfo['status'] = "unused";
    emailInfo['status_date'] = new Date()
    if (emailObj.isRead) {
        emailInfo['labelIds'] = 'INBOX';
        emailInfo['main_label'] = ['INBOX'];
    } else {
        emailInfo['labelIds'] = 'INBOX,UNREAD';
        emailInfo['main_label'] = ['INBOX', 'UNREAD'];
    }
    emailInfo['from_email'] = emailObj.from.emailAddress.address;
    // emailInfo['to_email'] = emailObj.toRecipients[0].emailAddress.address;
    emailInfo['from_email_name'] = emailObj.from.emailAddress.name;
    emailInfo['subject'] = emailObj.subject;
    emailInfo['email_id'] = emailObj.id;
    return emailInfo;
}


let getEmailInfoNew = async (emailInfo) => {
    let emailInfoNew = {};
    emailInfoNew['email_id'] = emailInfo['email_id'];
    emailInfoNew['historyId'] = emailInfo['historyId'];
    emailInfoNew['unsubscribe'] = emailInfo['unsubscribe'];
    emailInfoNew['subject'] = emailInfo['subject'];
    emailInfoNew['labelIds'] = emailInfo['labelIds'];
    emailInfoNew['main_label'] = emailInfo['main_label'];
    // console.log(emailInfoNew);
    return emailInfoNew;
}
async function checkUserOldAction(emailInfo, user_id, auth) {
    let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }, { status: 1 }).catch(err => {
        console.error(err.message, err.stack);
    });
    if (fromEmail) {
        let emailInfoNew = await getEmailInfoNew(emailInfo);
        emailInfoNew['from_email_id'] = fromEmail._id;
        console.log(emailInfoNew)
        await ExpenseBit.UpdateEmailInformation(emailInfoNew).catch(err => {
            console.error(err.message, err.stack, "checking");
        });
        if (fromEmail.status == "move") {
            let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
            let id = await Outlook.getFolderListForScrapping(accessToken, user_id, link, emailInfoNew.email_id)
        } else if (fromEmail.staus == "trash") {
            let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
            await Outlook.getFolderListForTrashScrapping(accessToken, user_id, link, emailInfoNew.email_id);
        }

        return true;
    }
    return false;
}
async function checkOtherUserActions(emailInfo, user_id) {
    let totalAvailable = await email.count({ "from_email": emailInfo.from_email, "status": { $in: ["move", "trash"] } }).catch(err => { console.error(err.message, err.stack); });
    console.log(totalAvailable)
    if (totalAvailable >= 2) {
        await createNewEmailForUser(emailInfo, user_id);
        return true;
    }
    return false;
}
async function createNewEmailForUser(emailInfo, user_id) {
    await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
        console.error(err.message, err.stack);
    });
    let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }, { status: 1 }).catch(err => {
        console.error(err.message, err.stack);
    });
    let emailInfoNew = await getEmailInfoNew(emailInfo);
    emailInfoNew['from_email_id'] = fromEmail._id;
    console.log(emailInfoNew)
    await ExpenseBit.UpdateEmailInformation(emailInfoNew).catch(err => {
        console.error(err.message, err.stack, "checking");
    });
    return true;
}

let checkEmail = async (emailObj, user_id, auth) => {
    let emailInfo = await createEmailInfo(user_id, null, emailObj);
    if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
        return
    }
    if (await checkUserOldAction(emailInfo, user_id, auth)) return;
    if (await checkOtherUserActions(emailInfo, user_id)) return;

    let url = await getUrlFromEmail(emailObj.body.content).catch(err => {
        console.error(err.message, err.stack, "dfgdhfvgdggd");
    });
    if (url != null && url!=undefined) {
        emailInfo['unsubscribe'] = url;
        await createNewEmailForUser(emailInfo, user_id);
    } else {
        await checkEmailForUnreadCount(user_id, emailInfo);
    }

}

async function checkEmailForUnreadCount(user_id, email) {
    if (email && email.labelIds.length != 0) {
        await com.jeet.memdb.RedisDB.pushData(user_id, email.from_email, email);
    }
}

async function getUrlFromEmail(emailObj) {
    if (!emailObj) {
        return null;
    }
    let $ = cheerio.load(emailObj);
    let url = null;
    $('a').each(async function (i, elem) {
        let fa = $(this).text();
        let anchortext = fa.toLowerCase();
        let anchorParentText = $(this).parent().text().toLowerCase();
        if (anchortext.indexOf("unsubscribe") != -1 ||
            anchortext.indexOf("preferences") != -1 ||
            anchortext.indexOf("subscription") != -1 ||
            anchortext.indexOf("visit this link") != -1 ||
            anchortext.indexOf("do not wish to receive our mails") != -1 ||
            anchortext.indexOf("not receiving our emails") != -1) {
            url = $(this).attr().href;
            console.log(url)
            return url;
        } else if (anchorParentText.indexOf("not receiving our emails") != -1 ||
            anchorParentText.indexOf("stop receiving emails") != -1 ||
            anchorParentText.indexOf("unsubscribe") != -1 ||
            anchorParentText.indexOf("subscription") != -1 ||
            anchorParentText.indexOf("preferences") != -1 ||
            anchorParentText.indexOf("mailing list") != -1 ||
            (anchortext.indexOf("click here") != -1 && anchorParentText.indexOf("mailing list") != -1) ||
            ((anchortext.indexOf("here") != -1 || anchortext.indexOf("click here") != -1) && anchorParentText.indexOf("unsubscribe") != -1) ||
            anchorParentText.indexOf("Don't want this") != -1) {
            url = $(this).attr().href;
            console.log(url)
            return url;
        }
    })
    return url;
}

// let checkEmail = async (emailObj, user_id, accessToken) => {
//     // let emailData = emailObj.body.content;
//     // $ = cheerio.load(emailData);
//     // let url = null;
//     // let emailInfo = {};
//     // $('a').each(function (i, elem) {
//     //     let fa = $(this).text();
//     //     let anchortext = fa.toLowerCase();
//     //     let anchorParentText = $(this).parent().text().toLowerCase();

//     //     if (anchortext.indexOf("unsubscribe") != -1 ||
//     //         anchortext.indexOf("preferences") != -1 ||
//     //         anchortext.indexOf("subscription") != -1 ||
//     //         anchortext.indexOf("visit this link") != -1 ||
//     //         anchortext.indexOf("do not wish to receive our mails") != -1 ||
//     //         anchortext.indexOf("not receiving our emails") != -1) {
//     //         url = $(this).attr().href;
//     //         console.log(url);
//     //     } else if (anchorParentText.indexOf("not receiving our emails") != -1 ||
//     //         anchorParentText.indexOf("stop receiving emails") != -1 ||
//     //         anchorParentText.indexOf("unsubscribe") != -1 ||
//     //         anchorParentText.indexOf("subscription") != -1 ||
//     //         anchorParentText.indexOf("preferences") != -1 ||
//     //         anchorParentText.indexOf("mailing list") != -1 ||
//     //         (anchortext.indexOf("click here") != -1 && anchorParentText.indexOf("mailing list") != -1) ||
//     //         ((anchortext.indexOf("here") != -1 || anchortext.indexOf("click here") != -1) && anchorParentText.indexOf("unsubscribe") != -1) ||
//     //         anchorParentText.indexOf("Don't want this") != -1) {
//     //         url = $(this).attr().href;
//     //         console.log(url)
//     //     }
//     // })
//     // if (url != null) {
//     //     emailInfo['user_id'] = user_id;
//     //     emailInfo['mail_data'] = null;
//     //     emailInfo['unsubscribe'] = url;
//     //     emailInfo['status'] = "unused";
//     //     emailInfo['status_date'] = new Date()
//     //     if (emailObj.isRead) {
//     //         emailInfo['labelIds'] = 'INBOX';
//     //         emailInfo['main_label'] = ['INBOX'];
//     //     } else {
//     //         emailInfo['labelIds'] = 'INBOX,UNREAD';
//     //         emailInfo['main_label'] = ['INBOX', 'UNREAD'];
//     //     }
//     //     emailInfo['from_email'] = emailObj.from.emailAddress.address;
//     //     emailInfo['to_email'] = emailObj.toRecipients[0].emailAddress.address;
//     //     emailInfo['from_email_name'] = emailObj.from.emailAddress.name;
//     //     emailInfo['subject'] = emailObj.subject;
//     //     let emailInfoNew = {};
//     //     emailInfoNew['email_id'] = emailObj.id;
//     //     emailInfoNew['historyId'] = emailInfo['historyId'];
//     //     emailInfoNew['unsubscribe'] = emailInfo['unsubscribe'];
//     //     emailInfoNew['subject'] = emailInfo['subject'];
//     //     emailInfoNew['labelIds'] = emailInfo['labelIds'];
//     //     emailInfoNew['main_label'] = emailInfo['main_label'];
//         if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
//             console.log(emailInfo.from_email)
//         } else {
//             try {
//                 let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
//                     console.error(err.message, err.stack);
//                 });
//                 if (!fromEmail) {
//                     await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
//                         console.error(err.message, err.stack);
//                     });
//                     fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
//                         console.error(err.message, err.stack);
//                     });
//                 }
//                 if (fromEmail) {
//                     let doc = await emailInformation.findOne({ "email_id": emailInfoNew.email_id, "from_email_id": fromEmail._id }).catch(err => {
//                         console.error(err.message, err.stack);
//                     });
//                     if (!doc) {
//                         emailInfoNew['from_email_id'] = fromEmail._id;
//                         let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "status": "move", "user_id": user_id }).catch(err => {
//                             console.error(err.message, err.stack);
//                         });
//                         await ExpenseBit.UpdateEmailInformation(emailInfoNew);
//                         if (mailList) {
//                             let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
//                             let id = await Outlook.getFolderListForScrapping(accessToken, doc.user_id, link, emailInfoNew.email_id)
//                         }
//                         let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "status": "trash", "user_id": user_id }).catch(err => { console.error(err.message); });
//                         if (mailInfo) {
//                             let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
//                             await Outlook.getFolderListForTrashScrapping(accessToken, doc.user_id, link, emailInfoNew.email_id);
//                         }
//                     }
//                 }
//             } catch (err) {
//                 console.log(err);
//             }
//         }
//     }
// }


router.get('/auth/callback', async function (req, res) {
    console.log("came here")
    let auth_code = req.query.code;
    let state = req.query.state;
    let result = await oauth2.authorizationCode.getToken({
        code: auth_code,
        redirect_uri: process.env.REDIRECT_URI,
        scope: process.env.APP_SCOPES
    }).catch(err => {
        console.log(err);
    });

    const token = await oauth2.accessToken.create(result);;
    const userInfo = jwt.decode(token.token.id_token);
    var token_uniqueid = uniqid() + uniqid() + uniqid();
    users.findOne({ email: userInfo.preferred_username, email_client: "outlook" }, async function (err, existingUser) {
        if (existingUser) {
            await users.remove({ state: state }).catch(err => {
                console.log(err);
            });
            var userdata = {
                name: userInfo.name,
                state: state,
                email_client: "outlook"
            };
            await Outlook.updateUserInfo({ "email": userInfo.preferred_username, email_client: "outlook" }, userdata);
            // await users.findOneAndUpdate({ "email": userInfo.preferred_username, email_client: "outlook" }, userdata, { upsert: true }).catch(err => {
            //     console.log(err);
            // });
            await Outlook.extract_token(existingUser, token.token.access_token, token.token.refresh_token, token.token.id_token, token.token.expires_at, token.token.scope, token.token.token_type).catch(err => {
                console.log(err);
            });

            var tokmodel = new token_model({
                "user_id": existingUser._id,
                "token": token_uniqueid,
                "created_at": new Date()
            });
            let tokenid = await tokmodel.save().catch(err => {
                console.log(err);
            });
            console.log(tokenid)
            if (tokenid) {
                var jsondata = { "tokenid": token_uniqueid, "user": existingUser };
                res.send();
            }
        } else {
            users.findOne({ state: state }, async function (err, newUserData) {
                if (newUserData) {
                    var userdata = {
                        email: userInfo.preferred_username ? userInfo.preferred_username : '',
                        name: userInfo.name,
                        email_client: "outlook"
                    };
                    let newUser = await Outlook.updateUserInfo({ "state": state }, userdata);
                    // let newUser = await users.findOneAndUpdate({ "state": state }, userdata, { upsert: true }).catch(err => {
                    //     console.log(err);
                    // });
                    await Outlook.extract_token(newUserData, token.token.access_token, token.token.refresh_token, token.token.id_token, token.token.expires_at, token.token.scope, token.token.token_type).catch(err => {
                        console.log(err);
                    });
                    var tokmodel = new token_model({
                        "user_id": newUserData._id,
                        "token": token_uniqueid,
                        "created_at": new Date()
                    });
                    let tokenid = await tokmodel.save().catch(err => {
                        console.log(err);
                    });
                    if (tokenid) {
                        var jsondata = { "tokenid": token_uniqueid, "user": newUser };
                        console.log(jsondata)
                        res.send();
                    }
                }
            });
        }
    });
});




router.get('/getAuthTokenForApi', async function (req, res) {
    let state_code = req.query.state_code;
    users.findOne({ state: state_code }, async function (err, user) {
        if (user) {
            let tokenData = await token_model.findOne({ "user_id": user._id }).catch(err => {
                console.log(err);
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
});

module.exports = router



