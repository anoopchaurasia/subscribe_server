'use strict'
const express = require('express');

const TokenHandler = require("../helper/TokenHandler").TokenHandler;
const Expensebit = require("../helper/expenseBit").ExpenseBit;
const GetEmailQuery = require("../helper/getEmailQuery").GetEmailQuery;
const router = express.Router();
const { google } = require('googleapis');
const gmail = google.gmail('v1');

Array.prototype.asyncForEach = async function (cb) {
    for (let i = 0, len = this.length; i < len; i++) {
        await cb(this[i], i, this);
    }
}
/*
Thsi api for Reverting Back Trash Email from Trash folder to Inbox.
*/
router.post('/revertTrashMailToInbox', async (req, res) => {
    try {
        Controller.trashToInbox(req.token, req.body.from_email);
        res.status(200).json({
            error: false,
            data: "moving"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "2");
        res.sendStatus(400);
    }
});


/*
This api for Moving Email From INbox to SUbscribed Folder.(Whne swipe Left)
*/
router.post('/moveEmailToExpbit', async (req, res) => {
    try {
        const {is_unscubscribe, from_email} = req.body.from_email;
        if(is_unscubscribe) {
            /// emails are aleady in unsub folder
            Controller.unsubToInbox(req.token, from_email);
        } else {
            // no status as it may has unused
            Controller.inboxToUnsub(req.token, from_email);
        }
        res.status(200).json({
            error: false,
            data: "moving"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "4");
        res.sendStatus(400);
    }
});


/*
This Api for Scrapping Mail from INbox.
Based on user Information Email Inbox will be scrape
*/
router.post('/getMailInfo', async (req, res) => {
    try {
        Controller.extractEmail(req.token);
        res.status(200).json({
            error: false,
            data: "scrape"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});



router.post('/manualUnsubEmailFromUser', async (req, res) => {
    try {

        Controller.unsubBySender(req.token, req.body.sender_email);
        res.status(200).json({
            error: false,
            data: "scrape"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});


router.post('/manualTrashEmailFromUser', async (req, res) => {
    try {
        const token = req.token;
        let sender_email = req.body.sender_email;
        const authToken = await TokenHandler.getAccessToken(token.user_id).catch(e => console.error(e.message, e.stack, "5"));
        const oauth2Client = await TokenHandler.createAuthCleint(authToken);
        Expensebit.createEmailLabel(token.user_id, oauth2Client);
        let label = await Expensebit.findLabelId(oauth2Client);
        await getEmailFromSpecificSender(token.user_id, oauth2Client, null, label, sender_email, false);
        res.status(200).json({
            error: false,
            data: "scrape"
        })
    } catch (ex) {
        console.error(ex.message, ex.stack, "6");
        res.sendStatus(400);
    }
});


router.post('/getMailListForSender', async (req, res) => {
    try {
        const doc = req.token;
        let emaildetail = await EmailDetail.get({userId: req.token.user_id, from_email: req.body.from_email});
        res.status(200).json({
            error: false,
            data: emailinfos
        })
    } catch (err) {
        res.sendStatus(400);
        console.error(err.message, err.stack, "7");
    }
});



/*
This Api for Getting all Mail Subscri for Home screen for App.
This will get Filter subcription(new subscription only), unread Mail Info and total Count
*/
router.post('/readMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        let keylist = await RedisDB.getKEYS(doc.user_id);
        if (keylist && keylist.length != 0) {
            keylist.forEach(async element => {
                let mail = await RedisDB.popData(element);
                if (mail.length != 0) {
                    let result = await RedisDB.findPercent(mail);
                    if (result) {
                        let from_email_id = await Expensebit.saveAndReturnEmailData(JSON.parse(mail[0]), doc.user_id)
                        console.log(from_email_id)
                        await Expensebit.storeBulkEmailInDB(mail,from_email_id);
                    }
                }
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
    } catch (err) {
        console.error(err.message, err.stack, "8");
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
        const emailinfos = await GetEmailQuery.getAllSubscription(doc.user_id);
        const movedMail = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
        const totalEmail = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        const keepCount = await GetEmailQuery.getTotalKeepSubscription(doc.user_id);
        const trashCount = await GetEmailQuery.getTotalTrashSubscription(doc.user_id);
        const moveCount = await GetEmailQuery.getTotalMoveSubscription(doc.user_id);
        const totalUnscribeEmail = await GetEmailQuery.getTotalUnsubscribeEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            moveMail: movedMail,
            totalEmail: totalEmail,
            moveCount: moveCount,
            trashCount: trashCount,
            keepCount: keepCount,
            totalUnscribeEmail: totalUnscribeEmail
        })
    } catch (err) {
        console.error(err.message, err.stack, "9");
    }
});


router.post('/readMailInfoPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllFilteredSubscriptionPage(doc.user_id, req.body.skipcount);

        const unreademail = await GetEmailQuery.getUnreadEmailData(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreademail,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack, "10");
        res.sendStatus(400);
    }
});

/*
This api will get All unsubscribe Subscription Related Information.
*/
router.post('/getUnsubscribeMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllMovedSubscription(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadMovedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack, "11");
    }
});


router.post('/getUnsubscribeMailInfoPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllMovedSubscriptionPage(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadMovedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, err.stack, "11");
    }
});

/*
This api will get Filer subsciption(new only).
*/
router.post('/getEmailSubscription', async (req, res) => {
    try {
        res.status(200).json({
            error: false,
            data: await Controller.getUnusedEmails(req.token)
        })
    } catch (err) {
        console.error(err.message, err.stack, "12");
    }
});


/*
This api for getting only trash suscription information.
*/
router.post('/getDeletedEmailData', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllTrashSubscription(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadTrashEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "18");
    }
});

router.post('/getDeletedEmailDataPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllTrashSubscriptionPage(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadTrashEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "18");
    }
});


/*
This api for changing keeped subscription.(when swipe right)
this will changed changed is_keeped value in database for keped subscription
*/
router.post('/keepMailInformation', async (req, res) => {
    try {
        Controller.unusedToKeep(req.token, req.body.from_email);
        res.sendStatus(200)
    } catch (ex) {
        console.error(ex.message, ex.stack, "20");
        res.sendStatus(400);
    }
});


/*
This Api for getting only keeped subscription Information.
*/
router.post('/getKeepedMailInfo', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllKeepedSubscription(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "21");
    }
});
/// is it being used 
router.post('/getKeepedMailInfoPage', async (req, res) => {
    try {
        const doc = req.token;
        const emailinfos = await GetEmailQuery.getAllKeepedSubscriptionPage(doc.user_id);
        let unreadData = await GetEmailQuery.getUnreadKeepedEmail(doc.user_id);
        const total = await GetEmailQuery.getTotalEmailCount(doc.user_id);
        res.status(200).json({
            error: false,
            data: emailinfos,
            unreadData: unreadData,
            totalEmail: total
        })
    } catch (err) {
        console.error(err.message, ex.stack, "21");
    }
});




async function getEmailFromSpecificSender(user_id, auth, nextPageToken, label, sender_email,is_move) {
    !Email.validate(sender_email);
    let gmailInstance = await Gmail.getInstanceForUser(req.token.user_id);
    let scraper = Scraper.new(gmailInstance);
    let ids = await scraper.getEmaiIdsBySender(sender_email);
    if(ids.length==0) {
        throw new Error("no email fond for sender", sender_email, user_id);
    }
    let emaildetail_raw = EmailDetail.fromEamil({from_email: sender_email, from_email_name: sender_email, to_email: null}, token.user_id);
    let emaildetail = await EmailDetail.updateOrCreateAndGet({user_id: token.user_id, from_email: sender_email}, emaildetail_raw);
    
    let emailinfos = ids.map(x=> {
        return Emailinfo.fromEamil({email_id: x, labelIds:[]}, emaildetail._id);
    });

    Emailinfo.bulkInsert(emailinfos);
    if (responseList && responseList['data']['messages']) {
        responseList['data']['messages'].forEach(async element => {
            let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': element['id'] });
            if (response) {
                if (response.data.payload || response.data.payload['parts']) {
                    try {
                        if(is_move){
                            await Expensebit.manualMoveMail(response['data'], user_id, auth, label);
                        }else{
                            await Expensebit.manualTrashMail(response['data'], user_id, auth, label);
                        }
                    } catch (e) {
                        console.error(e.message, e.stack, "14");
                        return
                    }
                }
            }
        });
    }
    nextPageToken = responseList['data'].nextPageToken;
    if (responseList['data'].nextPageToken) {
        await getEmailFromSpecificSender(user_id, auth, responseList['data'].nextPageToken, label, sender_email,is_move);
    }
}

module.exports = router

