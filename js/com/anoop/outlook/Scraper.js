fm.Package("com.anoop.outlook");
fm.Import(".Message");
fm.Import(".Parser");
fm.Import(".Label");
// Array.prototype.asynForEach = async function (cb) {
//     for (let i = 0, len = this.length; i < len; i++) {
//         await cb(this[i]);
//     }
// }
fm.Class("Scraper>..email.BaseScraper", function (me, Message, Parser, Label) {
    this.setMe = _me => me = _me;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function (outlook) {
        return me.new(outlook);
    };

    this.Scraper = function (outlook) {
        this.outlook = outlook;
        me.base(outlook.user._id);
    }

    this.getFolderId = async function (accessToken, user_id, link, folder_name) {
        let folder_id = null;
        let folderList = await Message.getMailFoldersListInBatch(accessToken, link);
        let length = folderList.value.length;
        let count = 0;
        await folderList.value.asynForEach(async folder => {
            count++;
            if (folder.displayName == folder_name) {
                folder_id = folder.id;
            }
        });
        if (folder_id != null) {
            return folder_id;
        }
        if (count == length) {
            if (folderList['@odata.nextLink']) {
                return await me.getFolderId(accessToken, user_id, folderList['@odata.nextLink'], folder_name)
            } else {
                return null;
            }
        }
    }

    this.getTwoFolderId = async function (accessToken, user_id, link, source_name, destination_name, source_id, destination_id) {
        let folderList = await Message.getMailFoldersListInBatch(accessToken, link);
        let length = folderList.value.length;
        let count = 0;
        await folderList.value.asynForEach(async folder => {
            count++;
            if (folder.displayName == source_name) {
                source_id = folder.id;
            } else if (folder.displayName == destination_name) {
                destination_id = folder.id;
            }
        });
        if (source_id != null && destination_id != null) {
            return { source_id, destination_id };
        }
        if (count == length) {
            if (folderList['@odata.nextLink']) {
                return await me.getTwoFolderId(accessToken, user_id, folderList['@odata.nextLink'], source_name, destination_name, source_id, destination_id)
            } else {
                return null;
            }
        }
    }



    this.getWebhookMail = async function (accessToken, link, user_id) {
        let body = await Message.getHookMail(accessToken, link);
        await checkEmail(body, accessToken, user_id);
    }

    this.scrapEmail = async function (accessToken, user_id) {
        let folderList = await Message.getMailFolders(accessToken);
        await folderList.value.asynForEach(async folder => {
            if (folder.displayName == 'Inbox') {
                let link = encodeURI('https://graph.microsoft.com/v1.0/me/mailFolders/' + folder.id + '/messages?$skip=0');
                await getEmailInBulk(accessToken, link, user_id);
            }
        });
    }


    async function getEmailInBulk(accessToken, link, user_id) {
        let mailList = await Message.getBulkEmail(accessToken, link);
        await mailList.value.asynForEach(async oneEmail => {
            await checkEmail(oneEmail, accessToken, user_id)
        });
        if (mailList['@odata.nextLink']) {
            await getEmailInBulk(accessToken, encodeURI(mailList['@odata.nextLink']), user_id);
        } else {
            // await BaseController.scanFinished(user_id);
        }
    }

    async function automaticMailAction(accessToken, user_id, folder_id, data) {
        if (folder_id == null) {
            let new_folder = await Label.createFolderForOutlook(accessToken, user_id);
            folder_id = new_folder.id;
        }
        let response = await Label.moveOneMailFromInbox(accessToken, data.email_id, folder_id);
        await me.updateEmailInfoForOutlook(data.email_id, response.id)
        return
    }

    async function getFormatedEmailBody(body, user_id) {
        body['user_id'] = user_id;
        body['payload'] = body.body.content;
        if (body.isRead) {
            body['labelIds'] = 'INBOX';
            body['main_label'] = ['INBOX'];
        } else {
            body['labelIds'] = 'INBOX,UNREAD';
            body['main_label'] = ['INBOX', 'UNREAD'];
        }
        body['from_email'] = body.from.emailAddress.address;
        body['from_email_name'] = body.from.emailAddress.name;
        body['subject'] = body.subject;
        body['email_id'] = body.id;
        body['to_email'] = null;
        return body;
    }

    async function checkEmail(body, accessToken, user_id) {
        body = await getFormatedEmailBody(body, user_id);
        await me.sendMailToScraper(Parser.parse(body, user_id, null), me.outlook.user);
        await me.handleEamil(body, async (data, status) => {
            if (status == "move") {
                let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0";
                let folder_id = await me.getFolderId(accessToken, user_id, link, "Unsubscribed Emails");
                await automaticMailAction(accessToken, user_id, folder_id, data);
            } else if (status == "trash") {
                let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                let folder_id = await me.getFolderId(accessToken, user_id, link, "Junk Email");
                await automaticMailAction(accessToken, user_id, folder_id, data);
            }
        });
    }

    this.scrapManualEmail = async function (accessToken, user_id, from_email, action) {
        let folderList = await Message.getMailFolders(accessToken);
        await folderList.value.asynForEach(async folder => {
            if (folder.displayName == 'Inbox') {
                // let link = encodeURI('https://graph.microsoft.com/v1.0/me/mailFolders/' + folder.id + '/messages?$skip=0');
                let link = encodeURI('https://graph.microsoft.com/v1.0/me/mailFolders/' + folder.id + '/messages?$search="from:' + from_email + '"');
                await getEmailInBulkForManual(accessToken, link, user_id, from_email, action);
            }
        });
    }


    async function getEmailInBulkForManual(accessToken, link, user_id, from_email, action) {
        let mailList = await Message.getBulkEmail(accessToken, link);
        await mailList.value.asynForEach(async oneEmail => {
            await checkEmailForManualAction(oneEmail, accessToken, user_id, from_email, action)
        });
        if (mailList['@odata.nextLink']) {
            await getEmailInBulkForManual(accessToken, encodeURI(mailList['@odata.nextLink']), user_id, from_email, action);
        } else {
            // await BaseController.scanFinished(user_id);
        }
    }

    async function checkEmailForManualAction(body, accessToken, user_id, from_email, action) {
        body = await getFormatedEmailBody(body, user_id);
        await me.sendMailToScraper(Parser.parse(body, user_id, null), me.outlook.user);
        console.log(body)
      
        if (action === "move") {
            let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0";
            let folder_id = await me.getFolderId(accessToken, user_id, link, "Unsubscribed Emails");
            await automaticMailAction(accessToken, user_id, folder_id, body);
        } else if (action === "trash") {
            let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
            let folder_id = await me.getFolderId(accessToken, user_id, link, "Junk Email");
            await automaticMailAction(accessToken, user_id, folder_id, body);
        }
        let data_info = {
            user_id: user_id,
            from_email,
            status: "move"
        };
        await me.saveManualEmailData(user_id, data_info);
    }

});
