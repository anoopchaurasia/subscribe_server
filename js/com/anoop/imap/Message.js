fm.Package("com.anoop.imap");
const MailParser = require('mailparser').MailParser
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const TWO_MONTH_TIME_IN_MILI = 8 * 30 * 24 * 60 * 60 * 1000;
fm.Class("Message", function (me) {
    this.setMe = _me => me = _me;

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

    Static.getOnLaunchSpecificEmailList = async function (imap, last_scan_date) {
        return {
            seen: await search(imap, ["SEEN", ['SINCE', last_scan_date]]),
            unseen: await search(imap, ["UNSEEN", ['SINCE', last_scan_date]])
        }
    };

    Static.getLatestMessages = async function (imap, user) {
        let data = {
            seen: await search(imap, ["SEEN", ['UID', (user.last_msgId) + ':*']]),
            unseen: await search(imap, ["UNSEEN", ['UID', (user.last_msgId) + ':*']])
        }
        if(data.seen && data.seen[0] == user.last_msgId) data.seen.shift()
        if(data.unseen && data.unseen[0] == user.last_msgId) data.unseen.shift()
        return data;
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
        let newm_ids = [...message_ids];
        while(newm_ids.length) {
            let ids = newm_ids.splice(0, 50);
            await splituser(imap, ids, detector);
        }
    };

    async function splituser(imap, message_ids, detector){
        return new Promise((resolve, reject) => {
            const fetch = imap.fetch(message_ids, {
                bodies: '',
                struct: true
            });
            fetch.on('message', async function (msg, seqNo) {
                await detector(await parseMessage(msg, 'utf8').catch(err => console.error(err)));
            });
            fetch.on('end', async function () {
                console.log("end")
                resolve();
            });
        });
    }

    async function parseMessage(msg) {
        let [atts, parsed] = await Promise.all([
            new Promise(resolve => {
                msg.on('attributes', atts => {
                    resolve(atts)
                });
                msg.on('error', atts => reject(err));
            }),
            new Promise((resolve, reject) => {
                msg.on('body', (stream, info) => {
                    const chunks = [];
                    stream.once('error', reject);
                    stream.on('data', chunk => chunks.push(chunk));
                    stream.once('end', async () => {
                        const raw = Buffer.concat(chunks).toString('utf8');

                        let parsed = await simpleParser(raw, { skipHtmlToText: true, skipTextToHtml: true, skipTextLinks: true, skipImageLinks: true });
                        resolve(parsed)
                    });
                });
            })
        ]);
        parsed.uid = atts.uid;
        parsed.flags = atts.flags;
        return parsed;
    }

})