fm.Package("com.anoop.imap");
const MailParser = require('mailparser').MailParser
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const TWO_MONTH_TIME_IN_MILI = 2 * 30  * 24 * 60 * 60 * 1000;
fm.Class("Message", function (me) {
    this.setMe = _me => me = _me;

    Static.search

    Static.getAllEmailIdList = async function (imap, from_email) {
        let since = new Date(Date.now() - TWO_MONTH_TIME_IN_MILI);
        return await search(imap, [["FROM", from_email], ['SINCE', since]]);
    };

    Static.getInboxEmailIdByLabel = async function (imap, label_name) {
        return await search(imap, [label_name, ['SINCE', since]])
    };

    Static.getEmailList = async function (imap) {
        let since = new Date(Date.now() - TWO_MONTH_TIME_IN_MILI);
        return {
            seen: await search(imap, ["SEEN", ['SINCE', since]]),
            unseen: await search(imap, ["UNSEEN", ['SINCE', since]])
        }
    };

    Static.getLatestMessages = async function (imap, user) {
        return {
            seen: await search(imap, ["SEEN", ['UID', user.last_msgId + ':*']]),
            unseen: await search(imap, ["UNSEEN", ['UID', user.last_msgId + ':*']])
        }
    };

    async function search(imap, criteria) {
        return new Promise((resolve, reject) => {
            imap.search(criteria, function (err, uids) {
                (err ? reject(err) : resolve(uids));
            });
        });
    };

    Static.changeFolder = async function (imap, folder_name, ids) {
        return await new Promise((resolve, reject) => {
            imap.move(ids, folder_name, function (err) {
                (err ? reject(err) : resolve());
            });
        });
    };

    Static.getEmailsBySender = async function (gmail, sender, formatted_date) {

    };

    Static.getBatchMessage = async function (imap, message_ids, detector) {
        console.log("getBatchMessage", message_ids)
        return new Promise((resolve, reject) => {
            const fetch = imap.fetch(message_ids, {
                bodies: ['HEADER.FIELDS (FROM SUBJECT)', 'TEXT']
            });
            const msgs = [];
            fetch.on('message', async function (msg, seqNo) {
                console.log("getBatchMessage", seqNo)
                const parsed = await parseMessage(msg, 'utf8').catch(err => console.error(err));
                // console.log(parsed)
                if (detector(parsed)) msgs.push(parsed);
            });
            fetch.on('end', async function () {
                console.log("end")
                resolve(msgs);
            });
        });
    };


    async function parseMessage(msg) {

        const [atts, parsed] = await Promise.all([
            new Promise(resolve => {
                msg.on('attributes', atts => {
                    resolve(atts)
                });
                msg.on('error', atts => reject(err));
            }),
            new Promise((resolve, reject) => {
                let result;
                msg.on('body', (stream, info) => {
                    const chunks = [];
                    stream.once('error', reject);
                    stream.on('data', chunk => chunks.push(chunk));
                    stream.once('end', async () => {
                        const raw = Buffer.concat(chunks).toString('utf8');
                        let parsed = await simpleParser(raw);
                        if (!result) {
                            result = Imap.parseHeader(raw);
                            for (let k in result) {
                                if (Array.isArray(result[k])) result[k] = result[k][0];
                            }
                        }
                        // console.log(parsed)
                        if (result != {} && parsed['textAsHtml'] != undefined) {
                            resolve({ "header": result, parseBuff: parsed })
                            // let url = await getUrlFromEmail(parsed['textAsHtml']);
                            // if (url != null) {
                            //     console.log(url)
                            // }
                        }
                    });
                });
            })
        ]);
        parsed.uid = atts.uid;
        return parsed;

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


    async function getUrlFromEmail(body) {
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


    function getBatch(access_token) {

    };

})