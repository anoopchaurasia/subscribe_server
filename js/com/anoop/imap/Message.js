fm.Package("com.anoop.imap");
const MailParser = require('mailparser').MailParser
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const TWO_MONTH_TIME_IN_MILI = 8 * 30 * 24 * 60 * 60 * 1000;
const ONE_MONETH_TIME_IN_MILI = 1 * 30 * 24 * 60 * 60 * 1000;
fm.Class("Message", function (me) {
    this.setMe = _me => me = _me;

    Static.getAllEmailIdList = async function (imap, from_email) {
        let since = new Date(Date.now() - TWO_MONTH_TIME_IN_MILI);
        console.time("getAllEmailIdList")
        console.timeLog("getAllEmailIdList")
        let data = await search(imap, [["FROM", from_email], ['SINCE', since]]);
        console.timeEnd("getAllEmailIdList")
        console.log(data.length);
        return data;
    };

    Static.getAllEmailIdListBySender = async function (imap, from_email) {
        return await search(imap, [["FROM", from_email],]);
    };

    Static.getInboxEmailIdByLabel = async function (imap, label_name) {
        return await search(imap, [label_name, ['SINCE', since]])
    };


    Static.getDeleteEmailList = async function (imap) {
        let before = new Date(Date.now() - ONE_MONETH_TIME_IN_MILI);
        return await search(imap, [['BEFORE', before]]);
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
        // if(data.seen && data.seen[0] <= user.last_msgId) data.seen.shift()
        // if(data.unseen && data.unseen[0] <= user.last_msgId) data.unseen.shift()
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

    Static.deleteMsg = async function (imap, ids) {
        return await new Promise((resolve, reject) => {
            imap.setFlags(ids, ['\\Deleted'], function (err) {
                (err ? reject(err) : resolve());
            });
        });
    };


    Static.getEmailsBySender = async function (gmail, sender, formatted_date) {
    }

    Static.getBatchMessage = async function (imap, message_ids, detector, is_get_body) {
        let newm_ids = [...message_ids];
        while (newm_ids.length) {
            let ids = newm_ids.splice(0, 1000);
            await splituser(imap, ids, detector, is_get_body);
        }
    };

    async function splituser(imap, message_ids, detector, is_get_body = true) {
        var body = is_get_body === true ? "" : 'HEADER.FIELDS (FROM TO SUBJECT DATE)';
        return new Promise((resolve, reject) => {
            const fetch = imap.fetch(message_ids, {
                bodies: body,
                struct: true,
                size:true
            });
            const msgs = [];
            fetch.on('message', async function (msg, seqNo) {
                msgs.push(1);
                try {
                    await detector(await parseMessage(msg, 'utf8').catch(err => console.error(err)));
                } finally {
                    msgs.pop();
                    msgs.length === 0 && ended && resolve();
                }
            });
            let ended = false;
            fetch.on('end', async function () {
                console.log("end")
                ended = true;
                msgs.length === 0 && resolve()
                // resolve();
            });
        });
    }

    async function fetchSize(atts, size_arr=[]){
        if(Array.isArray(atts)) {
            atts.forEach(x=> fetchSize(x, size_arr));
            return size_arr;
        }
        size_arr.push({size:atts.size, part_id: atts.partID})
        return size_arr;
    }


    async function parseMessage(msg) {
        let [atts, parsed] = await Promise.all([
            new Promise(resolve => {
                msg.on('attributes',async atts => {
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
        parsed.size = atts.size;
        return parsed;
    }

    Static.getEmailListsBySize = async function (imap, smallerThan, largerThan) {

        let since = new Date(Date.now() - TWO_MONTH_TIME_IN_MILI);
        smallerThan = smallerThan * 1000000;
        largerThan = largerThan * 1000000;
        return {
            seen: await search(imap, ["SEEN", ['LARGER', largerThan], ['SMALLER', smallerThan], ['SINCE', since]]),
            unseen: await search(imap, ["UNSEEN", ['LARGER', largerThan], ['SMALLER', smallerThan], ['SINCE', since]])

        }
    };

    Static.getALlEmailList = async function (imap, trackedUser) {
        if (trackedUser && trackedUser.last_msgId) {
            return {
                seen: await search(imap, ["SEEN", ['UID', (trackedUser.last_msgId) + ':*']]),
                unseen: await search(imap, ["UNSEEN", ['UID', (trackedUser.last_msgId) + ':*']])
            }
        }
        return {
            seen: await search(imap, ["SEEN"]),
            unseen: await search(imap, ["UNSEEN"])
        }
    };

    Static.getUIDByBeforeOrAfterParticularDate = async function (imap, beforeOrAfter, date) {
        return {
            seen: await search(imap, ["SEEN", [beforeOrAfter, date]]),
            unseen: await search(imap, ["UNSEEN", [beforeOrAfter, date]])
        }
    };

    Static.getUIDByBetweenDate = async function (imap, since, before) {
        console.log(await search(imap, ["SEEN", ['SINCE', since], ['BEFORE', before]]))
        return {
            seen: await search(imap, ["SEEN", ['SINCE', since], ['BEFORE', before]]),
            unseen: await search(imap, ["UNSEEN", ['SINCE', since], ['BEFORE', before]])
        }
    };

    Static.getAllUID = async function (imap) {
        let since = new Date(Date.now() - TWO_MONTH_TIME_IN_MILI);
        return {
            seen: await search(imap, ["SEEN", ['SINCE', since]]),
            unseen: await search(imap, ["UNSEEN", ['SINCE', since]])
        }
    };


    Static.getBatchMessageAndReturnEmail = async function (imap, message_ids, detector) {
        return new Promise((resolve, reject) => {
            const fetch = imap.fetch(message_ids, {
                bodies: '',
                struct: true
            });
            const msgs = [];
            fetch.on('message', async function (msg, seqNo) {
                msgs.push(1)
                detector(await parseMessage(msg, 'utf8').catch(err => console.error(err)));
                msgs.pop();
                msgs.length === 0 && ended && resolve();
            });
            let ended = false;
            fetch.on('end', async function () {
                console.log("end")
                ended = true;
                msgs.length === 0 && resolve();
            });
        });
    };

})