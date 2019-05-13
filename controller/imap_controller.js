'use strict'
const express = require('express');
const router = express.Router();
const simpleParser = require('mailparser').simpleParser;
const Imap = require('imap');
const email = require('../models/emailDetailImap');
const emailInformation = require('../models/emailInfoImap');
const UserModel = require('../models/userImap');
const token_model = require('../models/tokeno');
const cheerio = require('cheerio');
const uniqid = require('uniqid');

router.post('/loginWithImap', async (req, res) => {
    try {
        let EMAIL = req.body.username;//'prantik@expensebit.com';
        let PASSWORD = req.body.password;//'X8gUne7rqLZS';
        // Connect
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        if (imap) {
            let user = await UserModel.findOne({ "email": EMAIL });
            if (!user) {
                var newUser = new UserModel({
                    "email": EMAIL,
                    "password": PASSWORD
                });
                user = await newUser.save().catch(err => {
                    console.error(err.message, err.stack);
                });
            }
            let response = await create_token(user);
            if (response) {
                // await createInbox(imap);
                imap.end(imap);
                res.status(200).json({
                    error: false,
                    data: response
                })
            } else {
                res.status(404).json({
                    error: true
                });
            }
        }
        // res.send({"status":200,"code":"xyz"})
    } catch (error) {
        console.log("here", error)
        res.status(401).json({
            error: true,
            data: null
        })
    }
});


async function create_token(user) {
    var token_uniqueid = uniqid() + uniqid() + uniqid();
    var tokmodel = new token_model({
        "user_id": user._id,
        "token": token_uniqueid,
        "created_at": new Date()
    });
    await tokmodel.save().catch(err => {
        console.error(err.message, err.stack);
    });
    return {
        "tokenid": token_uniqueid,
        "user": user
    };
}


router.post('/readZohoMail', async (req, res) => {
    let tokenInfo = await token_model.findOne({ "token": req.body.token });
    let user = await UserModel.findOne({ _id: tokenInfo.user_id });
    let EMAIL = user.email;
    let PASSWORD = user.password;
    console.log(user)
    const imap = await connect({ EMAIL, PASSWORD });
    console.log('Connected');

    // Open INBOX
    const box = await openBox(imap, 'INBOX');
    console.log('Box', box);

    // Get UNSEEN messages since yesterday
    let since = new Date(Date.now() - 864e5); // One day ago
    const ids = await search(imap, [box.messages.total - 1 + ':' + box.messages.total]);
    console.log('Ids', ids);

    // Get messages that don't have a subject
    const spam = await fetchAndFilter(imap, ids, async (msg, i) => {
        console.log(msg.header)
        let emailInfo = {};
        let from_data = msg.header.from.indexOf("<") != -1 ? msg.header.from.split("<")[1].replace(">", "") : msg.header.from;
        emailInfo['from_email_name'] = msg.header.from;
        emailInfo['from_email'] = from_data;
        emailInfo['status'] = "unused";
        emailInfo['status_date'] = new Date();
        let emailInfoNew = {
            msg_uid: msg.uid,
            unsubscribe: msg.url
        };
        let userInfo = await UserModel.findOne({ "email": "prantik@expensebit.com" });

        let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": userInfo._id }).catch(err => {
            console.error(err.message, err.stack);
        });
        if (!fromEmail) {
            await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": userInfo._id }, emailInfo, { upsert: true }).catch(err => {
                console.error(err.message, err.stack);
            });
            fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": userInfo._id }).catch(err => {
                console.error(err.message, err.stack);
            });
        }

        if (fromEmail) {
            let doc = await emailInformation.findOne({ "email_id": emailInfoNew.msg_uid, "from_email_id": fromEmail._id }).catch(err => {
                console.error(err.message, err.stack);
            });
            if (!doc) {
                emailInfoNew['from_email_id'] = fromEmail._id;

                await emailInformation.findOneAndUpdate({ "msg_uid": emailInfoNew.msg_uid, 'from_email_id': fromEmail._id }, emailInfoNew, { upsert: true }).catch(err => {
                    console.error(err.message, err.stack);
                });
            }
        }
        return msg;
    });

    spam.forEach(msg => {
        console.log(`Trashing #${msg.uid} from ${msg.from}`);
    });

    const spamIds = spam.map(msg => msg.uid);
    console.log(spamIds)
    // await createInbox(imap);
    // await trashzoho(imap, spamIds);
    // await sendToFolder(imap,spamIds);
    // await unsubscribe(imap,spamIds);
    imap.end(imap);

});

router.post('/getMailInfo', async (req, res) => {
    try {
        const doc = await token_model.findOne({ "token": req.body.token });
        if (doc) {
            const emailinfos = await getAllsubscription(doc.user_id);
            // const unreademail = await getUnreadEmailData(doc.user_id);
            const total = await getTotalEmailCount(doc.user_id);
            res.status(200).json({
                error: false,
                data: emailinfos,
                // unreadData: unreademail,
                totalEmail: total
            })
        }
    } catch (error) {
        console.log("here", error)
        res.send({ "status": 401, "code": "xyz" })
    }
});


async function getTotalEmailCount(user_id) {
    let totalNL = await email.find({ "user_id": user_id }).catch(err => {
        console.error(err.message, err.stack);
    });
    let total = 0;
    let count = 0;
    for (let i = 0; i < totalNL.length; i++) {
        count = await emailInformation.countDocuments({ 'from_email_id': totalNL[i]._id }).catch(err => {
            console.error(err.message, err.stack);
        });
        total = total + count;
    }
    return total;
}


async function getAllsubscription(user_id) {
    const emails = await email.find({ "status": "unused", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
    const senddata = [];
    for (let i = 0, len = emails.length; i < len; i++) {
        let x = emails[i];
        senddata.push({
            _id: {
                from_email: x.from_email
            },
            data: [{ from_email_name: x.from_email_name }],
            count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                console.error(err.message, err.stack);
            })
        })
    }
    return senddata;
}



router.post('/loginImap', async (req, res) => {
    const EMAIL = 'prantik@expensebit.com';
    const PASSWORD = 'X8gUne7rqLZS';
    // Connect
    const imap = await connect({ EMAIL, PASSWORD });
    console.log('Connected');

    // Open INBOX
    const box = await openBox(imap, 'INBOX');
    console.log('Box', box);

    // Get UNSEEN messages since yesterday
    let since = new Date(Date.now() - 864e5); // One day ago
    const ids = await search(imap, ['Seen', [box.messages.total - 1 + ':' + box.messages.total]]);
    console.log('Ids', ids);

    // Get messages that don't have a subject
    const spam = await fetchAndFilter(imap, ids, async (msg, i) => {
        console.log(msg.header)
        // let emailInfo={};
        // let from_data = msg.header.from.indexOf("<") != -1 ? msg.header.from.split("<")[1].replace(">", "") : msg.header.from;
        // emailInfo['from_email_name'] = msg.header.from;
        // emailInfo['from_email'] = from_data;
        // emailInfo['status'] = "unused";
        // emailInfo['status_date']=new Date();
        // let emailInfoNew={
        //     msg_uid: msg.uid,
        //     unsubscribe: msg.url
        // };
        // let userInfo = await UserModel.findOne({ "email":"prantik@expensebit.com"});

        // let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": userInfo._id }).catch(err => {
        //     console.error(err.message, err.stack);
        // });
        // if (!fromEmail) {
        //     await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": userInfo._id }, emailInfo, { upsert: true }).catch(err => {
        //         console.error(err.message, err.stack);
        //     });
        //     fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": userInfo._id }).catch(err => {
        //         console.error(err.message, err.stack);
        //     });
        // }

        // if (fromEmail) {
        //     let doc = await emailInformation.findOne({ "email_id": emailInfoNew.msg_uid, "from_email_id": fromEmail._id }).catch(err => {
        //         console.error(err.message, err.stack);
        //     });
        //     if (!doc) {
        //         emailInfoNew['from_email_id'] = fromEmail._id;

        //         await emailInformation.findOneAndUpdate({ "msg_uid": emailInfoNew.msg_uid,'from_email_id':fromEmail._id }, emailInfoNew, { upsert: true }).catch(err => {
        //             console.error(err.message, err.stack);
        //         });
        //     }
        // }
        return msg;
    });

    spam.forEach(msg => {
        console.log(`Trashing #${msg.uid} from ${msg.from}`);
    });

    const spamIds = spam.map(msg => msg.uid);
    console.log(spamIds)
    // await createInbox(imap);
    // await trashzoho(imap, spamIds);
    // await sendToFolder(imap,spamIds);
    // await unsubscribe(imap,spamIds);
    imap.end(imap);

});

function connect(loginCred, err, cb) {
    console.log(loginCred)
    let { EMAIL, PASSWORD } = loginCred;
    return new Promise((resolve, reject) => {

        const imap = new Imap({
            user: EMAIL,
            password: PASSWORD,
            host: 'imappro.zoho.com',
            port: 993,
            tls: true
        });

        imap.once('ready', async () => {
            resolve(imap)
        });
        imap.once('error', err => reject(err));
        imap.connect();
    })
}


router.post('/trashZohoMail', async (req, res) => {
    try {
        let tokenInfo = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        let user = await UserModel.findOne({ _id: tokenInfo.user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let EMAIL = user.email;
        let PASSWORD = user.password;
        console.log(user)
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        //   List mailboxes
    const boxes = await getBoxes(imap);
    const names = [];
    Object.keys(boxes).sort().forEach(boxName => {
        names.push(boxName);
        const box = boxes[boxName];
        if (box.children) {
            Object.keys(box.children).sort().forEach(childName => {
                names.push(`${boxName}${box.delimiter}${childName}`);
            });
        }
    });
    console.log('Mailboxes', names);
        const box = await openBox(imap, 'INBOX');

        let mail = await email.findOne({ "from_email": req.body.fromEmail, "status": "unused" }).catch(err => {
            console.error(err.message, err.stack);
        });
        console.log(mail)
        if (mail) {
            let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "msg_uid": 1 }).catch(err => { console.error(err.message, err.stack); });
            console.log(mailList)
            let msgUidList = mailList.map(x => x.msg_uid);
            if (msgUidList) {
                console.log(msgUidList)
                await trashzoho(imap, msgUidList);
                await email.findOneAndUpdate({ 'from_email': req.body.fromEmail }, { "status": "trash", "status_date": new Date() }, { upsert: true });
            }
            imap.end(imap);
            return res.status(200).json({
                error: false,
                data: "move"
            })
        }
        return res.status(401).json({
            error: true,
            data: "msg not found"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});


router.post('/unsubscribeZohoMail', async (req, res) => {
    try {
        let tokenInfo = await token_model.findOne({ "token": req.body.token }).catch(err => {
            console.error(err.message, err.stack);
        });
        let user = await UserModel.findOne({ _id: tokenInfo.user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let EMAIL = user.email;
        let PASSWORD = user.password;
        console.log(user)
        const imap = await connect({ EMAIL, PASSWORD });
        console.log('Connected');
        const box = await openBox(imap, 'INBOX');

        let mail = await email.findOne({ "from_email": req.body.fromEmail, "status": "unused" }).catch(err => {
            console.error(err.message, err.stack);
        });
        console.log(mail)
        if(mail){
            let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "msg_uid": 1 }).catch(err => { console.error(err.message, err.stack); });
            console.log(mailList)
            let msgUidList = mailList.map(x => x.msg_uid);
            if (msgUidList) {
                console.log(msgUidList)
                await unsubscribe(imap, msgUidList);
                await email.findOneAndUpdate({ 'from_email': req.body.fromEmail }, { "status": "move", "status_date": new Date() }, { upsert: true });
            }
            imap.end(imap);
            res.status(200).json({
                error: false,
                data: "move"
            })
        }
        res.status(401).json({
            error: true,
            data: "msg not found"
        })
    } catch (error) {
        console.log(error)
        res.status(401).json({
            error: error,
            data: null
        })
    }
});


function getBoxes(imap) {
    return new Promise((resolve, reject) => {
        imap.getBoxes(function (err, boxes) {
            (err ? reject(err) : resolve(boxes));
        });
    });
}

function createInbox(imap) {
    return new Promise((resolve, reject) => {
        imap.addBox("Unsubscribed Emails", function (err, box) {
            (err ? reject(err) : resolve(box));
        })
    });
}

function openBox(imap, boxName) {
    return new Promise((resolve, reject) => {
        imap.openBox(boxName, false, function (err, box) {
            (err ? reject(err) : resolve(box));
        });
    });
}

function search(imap, criteria) {
    return new Promise((resolve, reject) => {
        imap.search(criteria, function (err, uids) {
            (err ? reject(err) : resolve(uids));
        });
    });
}

async function getUrlFromEmail(body) {
    if (!body) {
        return null;
    }
    let $ = cheerio.load(body);
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
            return url;
        }
    })
    return url;
}

async function parseMessage(msg) {
    const [atts, parsed] = await Promise.all([
        new Promise(resolve => {
            msg.on('attributes', atts => {
                resolve(atts)
            });
            msg.on('error', atts => reject(err));
        }),

        new Promise((resolve, reject) => {
            let result;
            msg.on('body', (stream, info) => {
                const chunks = [];
                stream.once('error', reject);
                stream.on('data', chunk => chunks.push(chunk));
                stream.once('end', async () => {
                    const raw = Buffer.concat(chunks).toString('utf8');
                    let parsed = await simpleParser(raw);
                    if (!result) {
                        result = Imap.parseHeader(raw);
                        for (let k in result) {
                            if (Array.isArray(result[k])) result[k] = result[k][0];
                        }
                    }
                    if (result != {} && parsed['textAsHtml'] != undefined) {
                        let url = await getUrlFromEmail(parsed['textAsHtml']);
                        if (url != null) {
                            console.log(url)
                            resolve({ "header": result, "url": url })
                        }
                    }
                });
            });
        })
    ]);
    parsed.uid = atts.uid;
    return parsed;
}

function fetchAndFilter(imap, msgIds, detector) {
    return new Promise((resolve, reject) => {
        const fetch = imap.fetch(msgIds, {
            bodies: ['HEADER.FIELDS (FROM)', 'TEXT']
        });
        const pending = [];
        const msgs = [];
        fetch.on('message', async function (msg, seqNo) {
            pending.push(new Promise(async resolve => {
                // console.log(msg)
                let data = {}
                let result
                const parsed = await parseMessage(msg, 'utf8');
                console.log(parsed)

                if (detector(parsed)) msgs.push(parsed);
                resolve();
            }));
        });

        fetch.on('end', async function () {
            await Promise.all(pending);
            resolve(msgs);
        });
    });
}

async function trash(imap, msgIds) {
    if (!msgIds || msgIds.length <= 0) return;

    await new Promise((resolve, reject) => {
        imap.move(msgIds, '[Gmail]/Trash', function (err) {
            (err ? reject(err) : resolve());
        });
    });

    await new Promise((resolve, reject) => {
        imap.closeBox(true, function (err) {
            (err ? reject(err) : resolve());
        });
    });
}

async function trashzoho(imap, msgIds) {
    if (!msgIds || msgIds.length <= 0) return;
    console.log("trash",msgIds);
    await new Promise((resolve, reject) => {
        imap.move(msgIds, 'Trash', function (err) {
            (err ? reject(err) : resolve());
        });
    });

    await new Promise((resolve, reject) => {
        imap.closeBox(true, function (err) {
            (err ? reject(err) : resolve());
        });
    });
}

async function sendToFolder(imap, msgIds) {
    if (!msgIds || msgIds.length <= 0) return;

    await new Promise((resolve, reject) => {
        imap.move(msgIds, 'Unsubscribed Emails', function (err) {
            (err ? reject(err) : resolve());
        });
    });

    await new Promise((resolve, reject) => {
        imap.closeBox(true, function (err) {
            (err ? reject(err) : resolve());
        });
    });
}

async function unsubscribe(imap, msgIds) {
    if (!msgIds || msgIds.length <= 0) return;
    console.log("came here",msgIds)
    await new Promise((resolve, reject) => {    
        imap.move(msgIds, 'Unsubscribed Emails', function (err) {
            (err ? reject(err) : resolve());
        });
    });

    await new Promise((resolve, reject) => {
        imap.closeBox(true, function (err) {
            (err ? reject(err) : resolve());
        });
    });
}


module.exports = router


