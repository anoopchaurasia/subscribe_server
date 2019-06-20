fm.Package("com.anoop.gmail");
fm.Import(".Header");
fm.Import("..model.EmailDetail");
fm.Import("..model.EmailInfo");
fm.Class("Scraper>.Message", function(me, EmailDetail, EmailInfo){
    this.setMe=_me=>me=_me;
    Static.UNSUB_REGEX = /unsubscribe|mailing list|Don't want this|preferences|subscription|visit this link|stop receiving email|do not wish to receive our mails|not receiving our emails/i;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function(gmail){
        return me.new(gmail);
    };

    me.Scraper = function(gmail){
        this.gmail = gmail;
    }

    this.getEmailBody = function(message_ids){
        let messageBodies = await me.getBatchMessage(me.gmail, message_ids);
        return messageBodies.map(x=>{
            let header = Header.new(x.payload.headers);
            let payload = getParts(x.payload) || getPlainText(x.payload);
            let from = header.from.split(/<|>/);
            from = from.length===1?from[0]: from[from.length-2];
            return {
                header, payload, 
                email_id: x.id, 
                historyId: x.historyId, 
                labelIds: x.labelIds,
                from_email_name: header.from,
                from_email: from,
                to_email: x.to,
                subject: x.subject 
            };
        });
    };

    async function addToUnsubscribe(data, url){
        let emaildetailraw = EmailDetail.fromEamil(data, me.gemil.user_id);
        let emaildetail = await EmailDetail.updateOrCreateAndGet({from_email: emaildetailraw.from_email, user_id: emaildetailraw.user_id}, emaildetailraw);
        let emailinforaw = EmalInfo.fromEamil(data, emaildetail._id, url);
        await EmailInfo.updateOrCreateAndGet({from_email_id: emaildetail._id, email_id: emailinforaw.email_id}, emaildetailraw);
    }

    async function handleEamil(data) {
        let emaildetailraw = EmailDetail.fromEamil(data, me.gemil.user_id);
        let emaildetail = EmailDetail.getIfExist({from_email: emaildetailraw.from_email, user_id: emaildetailraw.user_id});
        if(emaildetail) {
            let emailinforaw = EmalInfo.fromEamil(data, emaildetail._id, url);
            EmailInfo.updateOrCreateAndGet({from_email_id: emaildetail._id, email_id: emailinforaw.email_id}, emaildetailraw);
            return;
        }
        let isEmailMovable = EmailDetail.isEmailMovable(emaildetail.from_email);
        if(isEmailMovable) {
            return await addToUnsubscribe(data, "");
        }
        let url = findUrlFromBody(data.payload);
        if(url) {
            return await addToUnsubscribe(data, url);
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

    this.start = async function(){
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; // "2019/2/1";
        let nextPageToken = null, messages, error;
        while({messages, error, nextPageToken} = await me.getEmailList(me.gmail, nextPageToken, formatted_date)) {
            let emailbodies = await me.getEmailBody(messages);
            await emailbodies.filter(x=> x.header["list-unsubscribe"]).asyncForEach(x=> {
                await addToUnsubscribe(x);
            });
            await emailbodies.filter(x=> !x.header["list-unsubscribe"]).asyncForEach(x=> {
                await handleEamil(x);
            });
            if(!nextPageToken) break;
        };
    }

    
    function getPlainText(payload) {
        var str = "";
        if (payload.parts) {
            for (var i = 0; i < payload.parts.length; i++) {
                str += getPlainText(payload.parts[i]);
            };
        }
        if (payload.mimeType == "text/plain") {
            return payload["body"]["data"];
        }
        return str;
    }
    function getParts(payload) {
        var str = "";
        if (payload.parts) {
            for (var i = 0; i < payload.parts.length; i++) {
                if (payload.mimeType == "multipart/alternative" && payload.parts[i].mimeType != 'text/html') continue;
                str += getParts(payload.parts[i]);
            };
        } else if ((payload.mimeType == "text/html")) {
            return payload["body"]["data"];
        }
        return str;
    }
});