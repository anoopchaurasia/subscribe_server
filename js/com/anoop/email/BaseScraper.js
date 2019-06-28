fm.Package('com.anoop.email');
fm.Import(".BaseController")
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
        let emaildetailraw = BaseController.getEmailDetailFromRaw(data, me.user_id);
        let emaildetail = await BaseController.getEmailDetailFromData(emaildetailraw);
        if(emaildetail) {
            return await BaseController.updateOrCreateAndGetEMailInfoFromData(emaildetail, data, "");
        }
        let isEmailMovable = await BaseController.isEmailMovable(emaildetailraw.from_email);
        if(isEmailMovable) {
            return await me.inboxToUnused(data, "");
        }
        let url = findUrlFromBody(data.payload);
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
        let bodydata = new Buffer(body, 'base64').toString('utf-8')
        let $ = cheerio.load(bodydata);
        let matched = $('a').reverse().find(async function (elem) {
            let $this = $(elem);
            if($this.text().match(me.UNSUB_REGEX) || $this.parent().text().match(me.UNSUB_REGEX)) {
                return true;
            }
        })
        return matched && $(matched).attr("href");
    };

});