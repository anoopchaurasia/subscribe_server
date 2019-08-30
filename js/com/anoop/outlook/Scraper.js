fm.Package("com.anoop.outlook");
fm.Import(".Message");
fm.Import(".Parser");
const OutlookHandler = require("./../../../../helper/outlook").Outlook;
// Array.prototype.asynForEach = async function (cb) {
//     for (let i = 0, len = this.length; i < len; i++) {
//         await cb(this[i]);
//     }
// }
fm.Class("Scraper>..email.BaseScraper", function (me, Message, Parser) {
    this.setMe = _me => me = _me;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function (outlook) {
        return me.new(outlook);
    };

    this.Scraper = function (outlook) {
        console.log(outlook)
        this.outlook = outlook;
        me.base(outlook.user._id);
    }

    this.getFolderId = async function (accessToken, user_id, link) {
        let folder_id=null;
        let folderList = await Message.getMailFoldersListInBatch(accessToken, link);
        console.log(folderList)
        let length = folderList.value.length;
        let count = 0;
        await folderList.value.asynForEach(async folder => {
            count++;
            if (folder.displayName == 'Unsubscribed Emails') {
                console.log("find folder",folder.id);
                folder_id=folder.id;
            }
        });
        if(folder_id!=null){
            return folder_id;
        }
        if (count == length) {
            if (folderList['@odata.nextLink']) {
                console.log("not found folder",folderList['@odata.nextLink']);
                return await me.getFolderId(accessToken, user_id, folderList['@odata.nextLink'])
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

    async function checkEmail(body, accessToken, user_id) {
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

        await me.sendMailToScraper(Parser.parse(body, user_id, null), me.outlook.user);
        await me.handleEamil(body, async (data, status) => {
            if (status == "move") {
                let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                let id = await OutlookHandler.getFolderListForScrapping(accessToken, user_id, link, data.email_id)
            } else if (status == "trash") {
                let link = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=0"
                await OutlookHandler.getFolderListForTrashScrapping(accessToken, user_id, link, data.email_id);
            }
        });
    }


});
