fm.Package('com.anoop.email');
fm.Import(".BaseController")
const cheerio = require('cheerio');
fm.Class('BaseScraper', function (me, BaseController) {
    'use strict';
    this.setMe = function (_me) {
        me = _me;
    };

    Static.UNSUB_REGEX = /unsubscribe|mailing list|Don't want this|preferences|subscription|visit this link|stop receiving email|do not wish to receive our mails|not receiving our emails/i;
    this.BaseScraper = function (user_id){
        this.user_id = user_id;
    };

    this.inboxToUnused =  async function (data, url){
        let emaildetail = await BaseController.updateOrCreateAndGetEMailDetailFromData(data, me.user_id);
        await BaseController.updateOrCreateAndGetEMailInfoFromData(emaildetail, data, url);
    }

    this.handleEamil = async function (data) {
        let emaildetailraw =await BaseController.dataToEmailDetailRaw(data, me.user_id);
        // console.log(emaildetailraw)
        // console.log(data)
        let emaildetail = await BaseController.getEmailDetailFromData(emaildetailraw);
        if(emaildetail) {
            return await BaseController.updateOrCreateAndGetEMailInfoFromData(emaildetail, data, "");
        }
        let isEmailMovable = await BaseController.isEmailMovable(emaildetailraw.from_email);
        if(isEmailMovable) {
            return await me.inboxToUnused(data, "");
        }
        let url =await getUrlFromEmail(data.payload);
        // console.log(url)
        if(url) {
            return await me.inboxToUnused(data, url);
        }
        if (data.labelIds.length != 0) {
            delete data.payload;
            await com.jeet.memdb.RedisDB.pushData(emaildetailraw.user_id, emaildetailraw.from_email, data);
        }
    }

    
    function findUrlFromBody(body) {
        if (!body) {
            return null;
        }
         let   bodydata = new Buffer(body, 'base64').toString('utf-8')
        let $ = cheerio.load(bodydata);
        let matched = $('a').reverse().find(async function (elem) {
            let $this = $(elem);
            if($this.text().match(me.UNSUB_REGEX) || $this.parent().text().match(me.UNSUB_REGEX)) {
                return true;
            }
        })
        return matched && $(matched).attr("href");
    };

    async function getUrlFromEmail(body) {
        if (body['textAsHtml'] != undefined) {
            body = body['textAsHtml'];
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
    }
});