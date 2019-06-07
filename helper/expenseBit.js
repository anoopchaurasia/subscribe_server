'use strict'
const AuthToken = require('../models/authoToken');
const email = require('../models/emailDetails');
const emailInformation = require('../models/emailInfo');
const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const { google } = require('googleapis');
const cheerio = require('cheerio');
const Pubsub = require("../helper/pubsub").Pubsub;
const TrashEmail = require("../helper/trashEmail").TrashEmail;
const GmailApi = require("../helper/gmailApis").GmailApis;
fm.Include("com.jeet.memdb.RedisDB");

Array.prototype.asynForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i]);
    }
}

class ExpenseBit {

    /*
    This function for getting Gmail Instance for another api/function.
    Using Accesstoken Infor and Credential Gmail Instance will be created.
    */
    static async getGmailInstance(auth) {
        const authToken = await TokenHandler.getAccessToken(auth.user_id).catch(e => console.error(e.message, e.stack,"41"));
        let oauth2Client = await TokenHandler.createAuthCleint();
        oauth2Client.credentials = authToken;
        return google.gmail({
            version: 'v1',
            oauth2Client
        });
    }



    /*
        This function will create Unsubscribed Emails label in to gmail account and update labelId into database.
    */
    static async createEmailLabel(user_id, auth) {
        const res = await GmailApi.createLabelGmailApi(auth);
        if (res) {
            const result = await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
        }
    }


    /*
        This function will move Email from Inbox to Unsubscribed Folder.
    */
    static async MoveMailFromInBOX(user_id, auth, from_email, label) {
        let mail = await email.findOne({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack,"42"); });
        let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack,"43"); });

        if (mailList) {
            let labelarry = [];
            labelarry[0] = label;
            let mailIDSARRAY = mailList.map(x => x.email_id);
            var oldvalue = {
                "from_email": from_email,
                "user_id": user_id
            };
            var newvalues = {
                $set: {
                    "status": "move",
                    "status_date": new Date()
                }
            };
            email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.error(err.message, err.stack,"44");
            });
            if (mailIDSARRAY.length != 0) {
                await GmailApi.batchModifyAddAndRemoveLabels(auth, mailIDSARRAY, labelarry, ['INBOX', 'CATEGORY_PERSONAL', 'CATEGORY_PROMOTIONS']);
                // await GmailApi.batchModifyAddLabels(auth, mailIDSARRAY, labelarry);
                // await GmailApi.batchModifyRemoveLabels(auth, mailIDSARRAY, ['INBOX']);
                // await GmailApi.batchModifyRemoveLabels(auth, mailIDSARRAY, ['CATEGORY_PROMOTIONS']);
                // await GmailApi.batchModifyRemoveLabels(auth, mailIDSARRAY, ['CATEGORY_PERSONAL']);
            }
        }
    }

    /*
        This function will revet back Moved Email to INBOX folder.
    */
    static async  MoveMailFromExpenseBit(user_id, auth, from_email, label) {
        let mail = await email.findOne({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack,"45"); });
        let mailList = await emailInformation.find({ "from_email_id": mail._id }, { "email_id": 1 }).catch(err => { console.error(err.message, err.stack,"46"); });

        if (mailList) {
            var oldvalue = {
                user_id: user_id,
                "from_email": from_email,
                "status": "move"
            };
            var newvalues = {
                $set: {
                    "status": "keep",
                    "status_date": new Date()
                }
            };
            email.findOneAndUpdate(oldvalue, newvalues, { upsert: true }).catch(err => {
                console.error(err.message, err.stack,"47");
            });
            let labelarry = [];
            labelarry[0] = label;
            let emailIdList = mailList.map(x => x.email_id);
            if (emailIdList) {
                await GmailApi.batchModifyAddAndRemoveLabels(auth, emailIdList, ['INBOX'], labelarry)
                // await GmailApi.batchModifyRemoveLabels(auth, emailIdList,labelarry);
                // await GmailApi.batchModifyAddLabels(auth, emailIdList, ['INBOX']);
            }
        }
    }

    /*
        This function will update batch email with give information
    */
    static async UpdateBatchEmail(oldvalue, newvalues) {
        await email.updateMany(oldvalue, newvalues, { upsert: true }).catch(err => {
            console.error(err.message, err.stack,"48");
        });
    }

    /*
        This Function Will Moved All Emails To Unsubscribed Folder from Inbox
    */
    static async  MoveAllMailFromInBOX(user_id, auth, label) {
        let mailList = await email.find({ "user_id": user_id, "status": "unused" }).catch(err => { console.error(err.message, err.stack,"49"); });
        if (mailList) {
            var oldvalue = {
                user_id: user_id,
                "status": "unused"
            };
            var newvalues = {
                $set: {
                    "status": "move",
                    "status_date": new Date()
                }
            };
            await ExpenseBit.UpdateBatchEmail(oldvalue, newvalues);
            let labelarry = [];
            labelarry[0] = label;
            let mailIdList = mailList.map(x => x.email_id);
            if (mailIdList) {
                await GmailApi.batchModifyAddLabels(auth, mailIdList, labelarry);
                await ExpenseBit.sleep(2000);
            }
        }
    }

    /*
        This function will wait for Given Time/sleep.
    */
    static async sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }


    /*
        This Function Will return Url from Email/parsed Data.
        Base On given Keyword Email subscribe link will be extracted and returning to calling function.
    */
    static async getUrlFromEmail(emailObj) {
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

    /*
        This function will create Json Object from Email data for storing into database.
        based on given information email object will be created.
    */
    static async createEmailInfo(user_id, url, mail) {
        let emailInfo = {};
        emailInfo['user_id'] = user_id;
        emailInfo['mail_data'] = null;
        emailInfo['email_id'] = mail.id;
        emailInfo['historyId'] = mail.historyId;
        emailInfo['labelIds'] = mail.labelIds;
        emailInfo['unsubscribe'] = url;
        emailInfo['main_label'] = mail.labelIds;
        emailInfo['status'] = "unused";
        emailInfo['status_date'] = new Date()
        if (mail.labelIds.indexOf("TRASH") != -1) {
            emailInfo['status'] = "trash";
        }
        let header_raw = mail['payload']['headers']
        header_raw.forEach(async data => {
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
        return emailInfo;
    }


    static async checkEmailForUnreadCount(user_id, email) {
        if (email && email.labelIds.length != 0) {
            await com.jeet.memdb.RedisDB.pushData(user_id, email.from_email, email);
        }
    }
    static async getEmailInfoNew(emailInfo) {
        let emailInfoNew = {};
        emailInfoNew['email_id'] = emailInfo['email_id'];
        emailInfoNew['historyId'] = emailInfo['historyId'];
        emailInfoNew['unsubscribe'] = emailInfo['unsubscribe'];
        emailInfoNew['subject'] = emailInfo['subject'];
        emailInfoNew['labelIds'] = emailInfo['labelIds'];
        emailInfoNew['main_label'] = emailInfo['main_label'];
        return emailInfoNew;
    }


    static async checkEmailNew(emailObj, mail, user_id, auth) {
        let emailInfo = await ExpenseBit.createEmailInfo(user_id, null, mail);
        if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {
            return
        }
        async function checkUserOldAction(emailInfo, user_id, auth) {
            let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }, { status: 1 }).catch(err => {
                console.error(err.message, err.stack,"50");
            });
            if (fromEmail) {
                let emailInfoNew = await ExpenseBit.getEmailInfoNew(emailInfo);
                emailInfoNew['from_email_id'] = fromEmail._id;
                await ExpenseBit.UpdateEmailInformation(emailInfoNew).catch(err => {
                    console.error(err.message, err.stack, "51");
                });
                if (fromEmail.status == "move") {
                    // console.log("moved")
                    await Pubsub.getListLabel(user_id, auth, emailInfoNew);
                } else if (fromEmail.staus == "trash") {
                    await TrashEmail.inboxToTrashFromExpenseBit(auth, emailInfoNew);
                }
                return true;
            }
            return false;
        }
        async function checkOtherUserActions(emailInfo, user_id) {
            let totalAvailable = await email.count({ "from_email": emailInfo.from_email, "status": { $in: ["move", "trash"] } }).catch(err => { console.error(err.message, err.stack); });
            if (totalAvailable >= 2) {
                await createNewEmailForUser(emailInfo, user_id);
                return true;
            }
            return false;
        }

        async function createNewEmailForUser(emailInfo,user_id){
            await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
                console.error(err.message, err.stack,"52");
            });
            let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }, { status: 1 }).catch(err => {
                console.error(err.message, err.stack,"53");
            });
            let emailInfoNew = await ExpenseBit.getEmailInfoNew(emailInfo);
            emailInfoNew['from_email_id'] = fromEmail._id;
            await ExpenseBit.UpdateEmailInformation(emailInfoNew).catch(err => {
                console.error(err.message, err.stack, "54");
            });
            return true;
        }
        if (await checkUserOldAction(emailInfo, user_id, auth)) return;
        if (await checkOtherUserActions(emailInfo, user_id)) return;

        let url = await ExpenseBit.getUrlFromEmail(emailObj).catch(err => {
            console.error(err.message, err.stack, "55");
        });
        if (url != null) {
            emailInfo['unsubscribe'] = url;
           await  createNewEmailForUser(emailInfo,user_id);
        } else {
            await ExpenseBit.checkEmailForUnreadCount(user_id, emailInfo);
        }

}



    /*
        This Function will get url and email object.
        using that if email is present into dtabase then doing nothing else creating new email in database.
        checking if from_email present and email moved/trash then based on that new email will be moved/trashed.
    */
    static async checkEmail(emailObj, mail, user_id, auth) {
    let url = await ExpenseBit.getUrlFromEmail(emailObj);
    if (url != null) {
        let emailInfo = await ExpenseBit.createEmailInfo(user_id, url, mail);
        if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {

        } else if (emailInfo) {
            let emailInfoNew = await ExpenseBit.getEmailInfoNew(emailInfo);

            try {

                let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
                    console.error(err.message, err.stack,"56");
                });
                if (!fromEmail) {
                    await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
                        console.error(err.message, err.stack,"57");
                    });
                    fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
                        console.error(err.message, err.stack,"58");
                    });
                }

                if (fromEmail) {
                    let doc = await emailInformation.findOne({ "email_id": emailInfoNew.email_id, "from_email_id": fromEmail._id }).catch(err => {
                        console.error(err.message, err.stack,"59");
                    });
                    if (!doc) {
                        emailInfoNew['from_email_id'] = fromEmail._id;
                        let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "status": "move", "user_id": user_id }).catch(err => {
                            console.error(err.message, err.stack,"60");
                        });

                        await ExpenseBit.UpdateEmailInformation(emailInfoNew);
                        if (mailList) {
                            await Pubsub.getListLabel(user_id, auth, emailInfoNew);
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "status": "trash", "user_id": user_id }).catch(err => { console.error(err.message); });
                        if (mailInfo) {
                            await TrashEmail.inboxToTrashFromExpenseBit(auth, emailInfoNew);
                        }
                    }
                }
            } catch (err) {
                console.error(err.message, err.stack,"61");
            }
        }
    }
}

    static async saveAndReturnEmailData(emailInfo, user_id) {
    if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {

        return
    }
    else {
        let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack,"62");
        });
        if (!fromEmail) {
            await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
                console.error(err.message, err.stack,"63");
            });
            fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
                console.error(err.message, err.stack,"64");
            });
        }
        if (fromEmail) {
            return fromEmail._id;
        }
    }
}


    static async storeBulkEmailInDB(email, from_email_id) {
    var bulk = emailInformation.collection.initializeUnorderedBulkOp();
        await email.asynForEach(async emailInfo => {
        emailInfo = JSON.parse(emailInfo);
        let emailInfoNew = await ExpenseBit.getEmailInfoNew(emailInfo);
        emailInfoNew['from_email_id'] = from_email_id;
        try {
            bulk.find({ "email_id": emailInfo.email_id }).upsert().update({ $set: emailInfoNew });
        } catch (err) {
            console.error(err.message, err.stack,"65");
        }
    });
    if(bulk.length>0){
        bulk.execute(function (err, result) {
            if(err){
                console.log(err,"66")
            }
            if(result){
                console.log(result);
            }
        })
    }
}

    static async checkEmailWithInscribeHeader(url, mail, user_id, auth) {
    if (url != null) {
        let emailInfo = await ExpenseBit.createEmailInfo(user_id, url, mail);
        // await ExpenseBit.checkEmailForUnreadCount(user_id, emailInfo);
        if (emailInfo.from_email.toLowerCase().indexOf('@gmail') != -1) {

            return
        } else if (emailInfo) {
            let emailInfoNew = await ExpenseBit.getEmailInfoNew(emailInfo);

            try {

                let fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
                    console.error(err.message, err.stack,"67");
                });
                if (!fromEmail) {
                    await email.findOneAndUpdate({ "from_email": emailInfo.from_email, "user_id": user_id }, emailInfo, { upsert: true }).catch(err => {
                        console.error(err.message, err.stack,"68");
                    });
                    fromEmail = await email.findOne({ "from_email": emailInfo.from_email, "user_id": user_id }).catch(err => {
                        console.error(err.message, err.stack,"69");
                    });
                }

                if (fromEmail) {
                    let doc = await emailInformation.findOne({ "email_id": emailInfoNew.email_id, "from_email_id": fromEmail._id }).catch(err => {
                        console.error(err.message, err.stack,"70");
                    });
                    if (!doc) {
                        emailInfoNew['from_email_id'] = fromEmail._id;
                        let mailList = await email.findOne({ "from_email": emailInfo['from_email'], "status": "move", "user_id": user_id }).catch(err => {
                            console.error(err.message, err.stack,"71");
                        });

                        await ExpenseBit.UpdateEmailInformation(emailInfoNew);
                        if (mailList) {
                            await Pubsub.getListLabel(user_id, auth, emailInfoNew);
                        }
                        let mailInfo = await email.findOne({ "from_email": emailInfo['from_email'], "status": "trash", "user_id": user_id }).catch(err => { console.error(err.message,"72"); });
                        if (mailInfo) {
                            await TrashEmail.inboxToTrashFromExpenseBit(auth, emailInfoNew);
                        }
                    }
                }
            } catch (err) {
                console.error(err.message, err.stack);
            }
        }
    }
}


    /*
        This function will check if lable or unsubscribed email folder created or not.
        if not then it will create new folder.
        and update that label id into database. using that label id moveEmail function will be called for moving mail fom Inbox.
    */
    static async getListLabel(user_id, auth, from_email, is_unscubscribe, is_remove_all) {
    const res = await GmailApi.getLabelListGmailAPi(auth);
    if (res) {
        let lbl_id = null;
        res.data.labels.forEach(lbl => {
            if (lbl.name === "Unsubscribed Emails") {
                lbl_id = lbl.id;
            }
        });
        if (lbl_id == null) {
            const response = await ExpenseBit.createAndUpdateEmailLabel(user_id, auth);
            lbl_id = response.data.id;
        } else {
            await ExpenseBit.UpdateLableInsideToken(user_id, lbl_id);
        }
        if (is_unscubscribe) {

            await ExpenseBit.MoveMailFromExpenseBit(user_id, auth, from_email, lbl_id);
        } else {
            await ExpenseBit.MoveMailFromInBOX(user_id, auth, from_email, lbl_id);
        }

    }
}

    /*
        This function will create Unsubscribed Emails label in to gmail account and update labelId into database.
    */
    static async createAndUpdateEmailLabel(user_id, auth) {
    const res = await GmailApi.createLabelGmailApi(auth);
    await ExpenseBit.UpdateLableInsideToken(user_id, res.data.id);
    return res;
}

    /*
    This function Updating Label id into database.(for newly created label)
    */
    static async UpdateLableInsideToken(user_id, label) {
    const result = await AuthToken.updateOne({ user_id: user_id }, { $set: { "label_id": label } }, { upsert: true }).catch(err => { console.error(err.message, err.stack,"73"); });
    return result;
}

    /*
        This function will update email information into database.
    */
    static async UpdateEmailInformation(emailInfo) {
    await emailInformation.findOneAndUpdate({ "email_id": emailInfo.email_id }, emailInfo, { upsert: true }).catch(err => {
        console.error(err.message, err.stack,"74");
    });
}
}

exports.ExpenseBit = ExpenseBit;