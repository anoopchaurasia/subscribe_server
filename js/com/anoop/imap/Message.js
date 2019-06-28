fm.Package("com.anoop.imap");
const MailParser = require('mailparser').MailParser
const TWO_MONTH_TIME_IN_MILI = 2 * 30 * 24 * 60 * 60 * 1000;
fm.Class("Message", function(me){
    this.setMe=_me=>me=_me;
   
    Static.search
   
    Static.getAllEmailIdList = async function (imap, from_email){
        let since = new Date(Date.now() - TWO_MONTH_TIME_IN_MILI);
        return await search(imap, [["FROM", from_email], ['SINCE', since]]);
    };

    Static.getInboxEmailIdByLabel = async function (imap,label_name){
        return await search(imap, [label_name, ['SINCE', since]])
    };

    Static.getEmailList = async function (imap) {
        let since = new Date(Date.now() - TWO_MONTH_TIME_IN_MILI);
       return {
            seen:await search(imap, ["SEEN", ['SINCE', since]])
        }
    };

    async function search(imap, criteria) {
        return new Promise((resolve, reject) => {
            imap.search(criteria, function (err, uids) {
                (err ? reject(err) : resolve(uids));
            });
        });
    };

    Static.changeFolder = async function (imap,folder_name,ids){
        return await new Promise((resolve, reject) => {
            imap.move(ids, folder_name, function (err) {
                (err ? reject(err) : resolve());
            });
        });
    };

    Static.getEmailsBySender = async function(gmail, sender, formatted_date){
        
    };

    Static.getBatchMessage = async function(imap, message_ids, detector) {
        console.log("getBatchMessage", message_ids)
        return new Promise((resolve, reject) => {
            const fetch = imap.fetch(message_ids, {
                bodies: ['HEADER.FIELDS (FROM SUBJECT)', 'TEXT']
            });
            console.log(fetch)
            const msgs = [];
            fetch.on('message', async function (msg, seqNo) {
                console.log("getBatchMessage", seqNo)
                const parsed = await parseMessage(msg, 'utf8').catch(err=>console.error(err));
               // if (detector(parsed)) msgs.push(parsed);
            });
            fetch.on('end', async function () {
                console.log("end")
                resolve(msgs);
            });
        });
    };


    async function parseMessage(msg) {

        // console.log(msg);

        var parser = new MailParser();
        parser.on("headers", function (headers) {
            console.log("Header: " + JSON.stringify(headers));
        });

        parser.on('data', data => {
  
       //     console.log(data);  /* data.html*/

            // if (data.type === 'attachment') {
            //     console.log(data.filename);
            //     data.content.pipe(process.stdout);
            //     // data.content.on('end', () => data.release());
            // }
        });

        msg.on("body", function (stream) {
            stream.on("data", function (chunk) {
                parser.write(chunk.toString("utf8"));
            });
        });
        msg.once("end", function () {
            // console.log("Finished msg #" + seqno);
            parser.end();
        });

        // let isset=false;
        // const [atts, bufferdata] = await Promise.all([
        //     new Promise(resolve => {
        //         msg.on('attributes', atts => {
        //             resolve(atts)
        //         });
        //         msg.on('error', atts => reject(err));
        //     }),
        //     new Promise((resolve, reject) => {
        //         msg.on('body', (stream, info) => {
        //             const chunks = [];
        //             stream.once('error', reject);
        //             stream.on('data', chunk => chunks.push(chunk));
        //             stream.once('end', async () => {
        //                 if (isset) return;
        //                 isset=true
        //                 console.log("getBatchMessage", "sdsdsds")
        //                 const raw = Buffer.concat(chunks).toString('utf8');
        //                 resolve(raw);
        //             });
        //         });
        //     })
        // ]);
        // return { bufferdata, atts};
    }

    function getBatch(access_token) {
        
    };
    
})