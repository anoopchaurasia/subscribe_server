class ExpenseBit {
    static async getGmailInstance(auth) {
        let authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            oauth2Client
        });
    }

    static async MoveMailFromInBOX(user_id, auth, from_email, label) {
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
                            'addLabelIds': labelarry
                        }
                    });
                }
            }
        }
    }

    static async  MoveMailFromExpenseBit(user_id, auth, from_email, label) {
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

    static async  MoveAllMailFromInBOX(user_id, auth, from_email, label) {
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
                        }
                    });
                    TokenHandler.sleep(2000);
                }
            });
        }
    }

    static async sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }


    static async getListLabel(user_id, auth, from_email, is_unscubscribe, is_remove_all) {
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
                        if (is_remove_all) {
                            await TokenHandler.MoveAllMailFromInBOX(user_id, auth, from_email, res.data.id);
                        } else if (is_unscubscribe) {
                            await TokenHandler.MoveMailFromExpenseBit(user_id, auth, from_email, res.data.id);
                        } else {
                            await TokenHandler.MoveMailFromInBOX(user_id, auth, from_email, res.data.id);
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
                        await TokenHandler.MoveAllMailFromInBOX(user_id, auth, from_email, lbl_id);
                    } else if (is_unscubscribe) {
                        await TokenHandler.MoveMailFromExpenseBit(user_id, auth, from_email, lbl_id);
                    } else {
                        await TokenHandler.MoveMailFromInBOX(user_id, auth, from_email, lbl_id);
                    }
                }
            }
        }
    }

    static async checkEmail(emailObj, mail, user_id, auth) {
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
                anchortext.indexOf("not receiving our emails") != -1) {

                url = $(this).attr().href;
                console.log(url);

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
            }
        })
        if (url != null) {
            emailInfo['user_id'] = user_id;
            emailInfo['mail_data'] = null;
            emailInfo['email_id'] = mail.id;
            emailInfo['historyId'] = mail.historyId;
            emailInfo['labelIds'] = mail.labelIds;
            emailInfo['unsubscribe'] = url;
            emailInfo['main_label'] = mail.labelIds;
            emailInfo['is_moved'] = false;
            emailInfo['is_delete'] = false;
            emailInfo['is_keeped'] = false;
            if (mail.labelIds.indexOf("TRASH") != -1) {
                emailInfo['is_trash'] = true;
            } else {
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
            if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
                console.log(emailInfo.from_email)
            } else {
                try {
                    let doc = await email.findOne({ "email_id": emailInfo.email_id, "user_id": user_id }).catch(err => {
                        console.log(err);
                    });
                    if (!doc) {
                        let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "is_moved": true, "user_id": user_id }).catch(err => {
                            console.log(err);
                        });
                        console.log(mailList)
                        if (mailList) {
                            console.log("successfully moved to folder unscribe");
                            emailInfo.is_moved = true;
                            await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                            await TokenHandler.getListLabel(user_id, auth, mailList)
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "is_delete": true, "user_id": user_id }).catch(err => { console.log(err); });
                        if (mailInfo) {
                            emailInfo.is_delete = true;
                            await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                            console.log("successfully moved to folder delete");
                            await deleteEmailsAndMoveToTrash(user_id, auth, mailList.from_email)
                        }
                        if (!mailList && !mailInfo) {
                            await email.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => { console.log(err); });
                        }
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }
}

exports.ExpenseBit = ExpenseBit;