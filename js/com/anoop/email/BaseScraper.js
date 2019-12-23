fm.Package('com.anoop.email');
fm.Import(".BaseController")
fm.Import("com.jeet.memdb.RedisDB")
const cheerio = require('cheerio');
fm.Class('BaseScraper', function (me, BaseController, RedisDB) {
    'use strict';
    this.setMe = function (_me) {
        me = _me;
    };

    Static.UNSUB_REGEX = /unsubscribe|mailing list|Don't want this|preferences|subscription|visit this link|stop receiving email|do not wish to receive our mails|not receiving our emails/i;
    this.BaseScraper = function (user_id) {
        this.user_id = user_id;
    };

    this.inboxToUnused = async function (data, url) {
        if(data.from_email ==null || data.from_email_name==null){
            return
        }
        let emaildetail = await BaseController.updateOrCreateAndGetEMailDetailFromData(data, me.user_id);
        await BaseController.updateOrCreateAndGetEMailInfoFromData(emaildetail, data, url);
    }

    this.handleEamil = async function (data, automatic) {
        
        let { emaildetail, emaildetailraw } = await me.handleBasedOnPastAction(data, automatic);
        if(!emaildetailraw){
            return
        }
        if(data.from_email!=null){
            await BaseController.createSenderMail(data.from_email,emaildetailraw.user_id);
        }

        if (emaildetail) {
            return await BaseController.updateOrCreateAndGetEMailInfoFromData(emaildetail, data, "");
        }
        let isEmailMovable = await BaseController.isEmailMovable(emaildetailraw.from_email);
        if (isEmailMovable) {
            data['source'] = "count";
            return await me.inboxToUnused(data, "");
        }
        let url = await getUrlFromEmail(data.payload);
        if (url) {
            return await me.inboxToUnused(data, url);
        }
        if (data.labelIds.length != 0) {
            if(data.from_email ==null || data.from_email_name==null){
                return
            }
            let new_data = {
                from_email: data.from_email,
                from_email_name: data.from_email_name,
                to_email: data.to_email,
                source: "redis",
                email_id: data.email_id,
                historyId: data.historyId,
                subject: data.subject,
                labelIds: data.labelIds,
                receivedDateTime: data['header']?data.header.date.split('Date: ')[1]:data.receivedDateTime
            }
            await RedisDB.pushData(emaildetailraw.user_id, emaildetailraw.from_email, new_data);
            RedisDB.setExpire(emaildetailraw.user_id, emaildetailraw.from_email);
        }
    }

    this.handleBasedOnPastAction = async function (data, automatic) {
        let emaildetailraw = await BaseController.dataToEmailDetailRaw(data, me.user_id);
        let emaildetail = await BaseController.getEmailDetailFromData(emaildetailraw);
        if (emaildetail && emaildetail.status == "move") {
            await BaseController.updateOrCreateAndGetEMailInfoFromData(emaildetail, data, "");
            await automatic(data, "move");
            return {};
        }
        else if (emaildetail && emaildetail.status == "trash") {
            await BaseController.updateOrCreateAndGetEMailInfoFromData(emaildetail, data, "");
            await automatic(data, "trash");
            return {};
        }
        return { emaildetail, emaildetailraw }
    }

    this.getUserActionData = async function(user_id){
        return await BaseController.getUserActionData(user_id);
    }
    this.storEmailData = async function(data,user_id){
        await BaseController.storeEmailData(data,user_id);
    }

    this.updateLastTrackMessageId = async function(user_id,msg_id){
        await BaseController.updateLastTrackMessageId(user_id,msg_id);
    }

    this.getLastTrackMessageId = async function(user_id){
        return await BaseController.getLastTrackMessageId(user_id);
    }

    this.sendMailToScraper = async function (data, user, getBodyCB,is_get_body) {
        await BaseController.sendMailToScraper(data, user, getBodyCB,is_get_body);
    };

    this.notifyListner = async function (user_id) {
        await BaseController.notifyListner(user_id);
    };

    this.updateEmailInfoForOutlook  = async function(element_id, new_email_id){
        await BaseController.updateEmailInfoForOutlook(element_id, new_email_id);
    }

    async function getUrlFromEmail(body) {
        let url = null;
        if (body != undefined) {
            if (!body) {
                return null;
            }
            let $ = cheerio.load(body);
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
                    // console.log(url, "1")
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
                    // console.log(url, "2")
                    return url;
                }
            })
            return url;
        }
    }
});