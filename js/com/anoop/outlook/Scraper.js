fm.Package("com.anoop.outlook");
fm.Import(".Message");
fm.Import(".Parser");
const OutlookHandler = require("./../../../../helper/outlook").Outlook;
fm.Class("Scraper>..email.BaseScraper", function (me, Message, Parser) {
    this.setMe = _me => me = _me;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function (outlook) {
        return me.new(outlook);
    };

    this.Scraper = function (outlook) {
        this.outlook = outlook;
        me.base(outlook.user._id);
    }

    // this.start = async function (cb) {
    //     let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
    //     let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; // "2019/2/1";
    //     let nextPageToken = null, messages, error;
    //     while ({ messages, error, nextPageToken } = await Message.getEmailList(me.gmail, nextPageToken, formatted_date)) {
    //         let messageBodies = await Message.getBatchMessage(me.gmail, messages);
    //         let emailbodies = await Parser.getEmailBody(messageBodies);
    //         await emailbodies.filter(x => x.header["list-unsubscribe"]).asyncForEach(async x => {
    //             await me.inboxToUnused(x, x.header["list-unsubscribe"]);
    //         });
    //         await emailbodies.filter(x => !x.header["list-unsubscribe"]).asyncForEach(async x => {
    //             await me.handleEamil(x);
    //         });
    //         if (!nextPageToken || error) {
    //             error && console.error(error, "Scraper1")
    //             cb();
    //             break;
    //         }
    //     };
    // };

    // this.getEmaiIdsBySender = async function (sender) {
    //     let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
    //     let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    //     let nextPageToken = null, messages, error;
    //     let idlist = [];
    //     while ({ messages, error, nextPageToken } = await Message.getEmailsBySender(me.gmail, nextPageToken, formatted_date, sender)) {
    //         [].push.apply(idlist, messages.map(x => x.id));
    //         if (!nextPageToken || error) {
    //             error && console.error(error, "Scraper2")
    //             break;
    //         }
    //     }
    //     return idlist;
    // }

    this.getWebhookMail = async function (accessToken, link, user_id) {
        let body = await Message.getHookMail(accessToken, link);
        await checkEmail(body, accessToken, user_id);
    }

    this.scrapEmail = async function (accessToken, user_id) {
        let folderList = await Message.getMailFolders(accessToken);
        console.log(folderList)
        await folderList.value.asynForEach(async folder => {
            console.log(folder)
            if (folder.displayName == 'Inbox') {
                let link = encodeURI('https://graph.microsoft.com/v1.0/me/mailFolders/' + folder.id + '/messages?$skip=0');
                await getEmailInBulk(accessToken, link, user_id);
            }
        });
    }


    async function getEmailInBulk(accessToken, link, user_id) {
        let mailList = await Message.getBulkEmail(accessToken, link);
        await mailList.value.asynForEach(async oneEmail => {
            await checkEmail(oneEmail,accessToken, user_id)
        });
        if (body['@odata.nextLink']) {
            await getEmailInBulk(accessToken, encodeURI(body['@odata.nextLink']), user_id);
        } else {
            // await BaseController.scanFinished(user_id);
        }
    }

    async function checkEmail(body, accessToken, user_id) {
        console.log(body)
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
