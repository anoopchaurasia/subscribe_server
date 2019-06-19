fm.Package("com.anoop.gmail");
const { google } = require('googleapis');
fm.Class("Scraper>.Message", function(me){
    this.setMe=_me=>me=_me;
    Static.APPROX_TWO_MONTH_IN_MS = process.env.APPROX_TWO_MONTH_IN_MS || 4 * 30 * 24 * 60 * 60 * 1000;
    Static.getInstanceForUser = async function(gmail){
        return me.new(gmail);
    };

    me.Scraper = function(gmail){
        this.gmail = gmail;
    }

    this.getEmailBody = function(){
        
    }

    this.start = async function(){
        let date = new Date(Date.now() - me.APPROX_TWO_MONTH_IN_MS);
        let formatted_date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; // "2019/2/1";
        let nextPageToken = null, messages, error;
        while({messages, error, nextPageToken} = await me.getEmailList(me.gmail, nextPageToken, formatted_date)) {
            me.getEmailBody(messages);
            if(!nextPageToken) break;
        }
        


        let responseList = await gmail.users.messages.list({ auth: auth, userId: 'me', /*includeSpamTrash: true,*/ maxResults: 100, 'pageToken': nextPageToken, q: `from:* AND after:${formatted_date}` });
        if (responseList && responseList['data']['messages']) {
            responseList['data']['messages'].forEach(async element => {
                let response = await gmail.users.messages.get({ auth: auth, userId: 'me', 'id': element['id'] });
                if (response) {
                    if (response.data.payload || response.data.payload['parts']) {
                        let unsub_url;
                        let header_raw = response['data']['payload']['headers'];
                        header_raw.forEach(async data => {
                            if (data.name == "List-Unsubscribe") {
                                unsub_url = data.value;
                            }
                        })
                        try {
                            if (unsub_url) {
                                await Expensebit.checkEmailWithInscribeHeader(unsub_url, response['data'], user_id, auth);
                            } else {
                                let parsed = getParts(response['data']['payload']) || getPlainText(response['data']['payload'])
                                let bodydata = new Buffer(parsed, 'base64').toString('utf-8')
                                try {
                                   // await MailScraper.sendMailToScraper(com.anoop.email.Parser.parse(response['data'], bodydata), user_id);
                                } catch (e) {
                                    require('raven').captureException(e);
                                }
                                await Expensebit.checkEmailNew(bodydata, response['data'], user_id, auth,label);
                            }
                        } catch (e) {
                            console.error(e.message, e.stack,"14");
                            return
                        }
                    }
                }
            });
    }
});