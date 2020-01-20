'use strict'
const email = require('../models/emailDetails');
const emailInformation = require('../models/emailInfo');
class GetEmailQuery {
    /*
        This function will get All New subscription Information.
        New Means All Boolean with false vvalue(moved,trash,keep,delete)
    */
    static async getAllFilteredSubscription(user_id) {
        const emails = await email.find({ "status": "unused", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
        const senddata = [];
        for (let i = 0, len = emails.length; i < len; i++) {
            let x = emails[i];
            senddata.push({
                _id: {
                    from_email: x.from_email
                },
                data: [{ from_email_name: x.from_email_name }],
                count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                    console.error(err.message, err.stack, "1eq");
                })
            })
        }
        return senddata;
    }


    static async getTotalKeepSubscription(user_id) {
        let totalNL = await email.countDocuments({ "user_id": user_id, "status": "keep" }).catch(err => {
            console.error(err.message, err.stack, "1eeq");
        });
        return totalNL;
    }

    static async getTotalMoveSubscription(user_id) {
        let totalNL = await email.countDocuments({ "user_id": user_id, "status": "move" }).catch(err => {
            console.error(err.message, err.stack, "1eeq");
        });
        return totalNL;
    }

    static async getTotalTrashSubscription(user_id) {
        let totalNL = await email.countDocuments({ "user_id": user_id, "status": "trash" }).catch(err => {
            console.error(err.message, err.stack, "1eeq");
        });
        return totalNL;
    }

    /*
        This function will return all unread subscription Information.
    */
    static async getUnreadEmailData(user_id) {
        const emails = await email.find({ "status": "unused", "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack, "6eq");
        });
        let mailInfo = {};
        let count;
        for (let i = 0; i < emails.length; i++) {
            count = await emailInformation.countDocuments({ "labelIds": "UNREAD", "from_email_id": emails[i]._id }).catch(err => {
                console.error(err.message, err.stack, "7eq");
            });
            mailInfo[emails[i].from_email] = count
        }

        return mailInfo;
    }

    static async getAllMailBasedOnSender(user_id, from_email) {
        let mail = await email.findOne({ "from_email": from_email, "user_id": user_id }).catch(err => { console.error(err.message, err.stack, "3eq"); });
        let mailList;
        if (mail) {
            mailList = await emailInformation.find({ "from_email_id": mail._id }).catch(err => { console.error(err.message, err.stack, "4eq"); });
        }
        return mailList;
    }


    static async getAllMailBasedOnMultipleSender(user_id, from_email) {
        let mails = await email.find({ "from_email": {$in: from_email}, "user_id": user_id }).catch(err => { console.error(err.message, err.stack, "3eq"); });
        mails = mails.map(mail=>{return mail._id});
        let mailList;
        if (mails) {
            mailList = await emailInformation.find({ "from_email_id": {$in:mails} }).catch(err => { console.error(err.message, err.stack, "4eq"); });
        }
        return mailList;
    }

        


    /*
        This function will return all unread moved subscription Information.
    */
    static async getUnreadMovedEmail(user_id) {
        const emails = await email.find({ "status": "move", "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack, "8eq");
        });
        let mailInfo = {};
        let count;
        for (let i = 0; i < emails.length; i++) {
            count = await emailInformation.countDocuments({ "labelIds": "UNREAD", "from_email_id": emails[i]._id }).catch(err => {
                console.error(err.message, err.stack, "9eq");
            });
            mailInfo[emails[i].from_email] = count
        }

        return mailInfo;
    }

    /*
        This function will return Total Email Count for particular user.
    */
    static async getTotalEmailCount(user_id) {

        let totalNL = await email.find({ "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack, "10eq");
        });
        let total = 0;
        let count = 0;
        for (let i = 0; i < totalNL.length; i++) {
            count = await emailInformation.countDocuments({ 'from_email_id': totalNL[i]._id }).catch(err => {
                console.error(err.message, err.stack, "11eq");
            });
            total = total + count;
        }
        return total;
    }


      /*
        This function will return Total subscription Count for particular user.
    */
        static async getTotalSubscriptionCount(user_id) {
            let totalNL = await email.countDocuments({ "user_id": user_id ,"status": "unused"}).catch(err => {
                console.error(err.message, err.stack, "10eq");
            });
            return totalNL;
        }

    /*
        This function will return Total Unsubscribe Email count for particular User
    */
    static async getTotalUnsubscribeEmailCount(user_id) {
        let totalNL = await email.find({ "user_id": user_id, "status": "move" }).catch(err => {
            console.error(err.message, err.stack, "12eq");
        });
        let total = 0;
        let count = 0;
        for (let i = 0; i < totalNL.length; i++) {
            count = await emailInformation.countDocuments({ 'from_email_id': totalNL[i]._id }).catch(err => {
                console.error(err.message, err.stack, "13eq");
            });
            total = total + count;
        }
        return total;
    }


    /*
        This function will return All the subscription of the particular user.
    */
    static async getAllSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "user_id": user_id } }, {
            $group: {
                _id: { "from_email": "$from_email" }, data: {
                    $push: {
                        "labelIds": "$labelIds",
                        "email_id": "$email_id",
                        "from_email_name": "$from_email_name"
                    }
                }, count: { $sum: 1 }
            }
        },
        { $sort: { "count": -1 } },
        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
            console.error(err.message, err.stack, "14eq");
        });
        return emails;
    }


    /*
        This function will return all moved subscription list for particular user.
    */
    static async getAllMovedSubscription(user_id) {
        const emails = await email.find({ "status": "move", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
        const senddata = [];
        for (let i = 0, len = emails.length; i < len; i++) {
            let x = emails[i];
            senddata.push({
                _id: {
                    from_email: x.from_email
                },
                data: [{ from_email_name: x.from_email_name }],
                count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                    console.error(err.message, err.stack, "15eq");
                })
            })
        }
        return senddata;

    }   


    /*
        This function will return All keeped subscription List for particular user.
    */
    static async getAllKeepedSubscription(user_id) {
        const emails = await email.find({ "status": "keep", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
        const senddata = [];
        for (let i = 0, len = emails.length; i < len; i++) {
            let x = emails[i];
            senddata.push({
                _id: {
                    from_email: x.from_email
                },
                data: [{ from_email_name: x.from_email_name }],
                count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                    console.error(err.message, err.stack, "16eq");
                })
            })
        }

        return senddata;
    }



    

    /*
        This function will return Unread Keeped subscription information.
    */
    static async getUnreadKeepedEmail(user_id) {
        const emails = await email.find({ "status": "keep", "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack, "17eq");
        });
        let mailInfo = {};
        let count;
        for (let i = 0; i < emails.length; i++) {
            count = await emailInformation.countDocuments({ "labelIds": "UNREAD", "from_email_id": emails[i]._id }).catch(err => {
                console.error(err.message, err.stack, "18eq");
            });
            mailInfo[emails[i].from_email] = count
        }

        return mailInfo;
    }

    /*
        This function will return All Trash Subscription Information for particular User.
    */
    static async getAllTrashSubscription(user_id) {
        const emails = await email.find({ "status": "trash", "user_id": user_id }, { from_email: 1, from_email_name: 1 }).exec()
        const senddata = [];
        for (let i = 0, len = emails.length; i < len; i++) {
            let x = emails[i];
            senddata.push({
                _id: {
                    from_email: x.from_email
                },
                data: [{ from_email_name: x.from_email_name }],
                count: await emailInformation.countDocuments({ "from_email_id": x._id }).catch(err => {
                    console.error(err.message, err.stack, "19eq");
                })
            })
        }
        return senddata;
    }
    

    static async getUnreadTrashEmail(user_id) {
        const emails = await email.find({ "status": "trash", "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack, "20eq");
        });
        let mailInfo = {};
        let count;
        for (let i = 0; i < emails.length; i++) {
            count = await emailInformation.countDocuments({ "labelIds": "UNREAD", "from_email_id": emails[i]._id }).catch(err => {
                console.error(err.message, err.stack, "21eq");
            });
            mailInfo[emails[i].from_email] = count
        }

        return mailInfo;
    }


}


exports.GetEmailQuery = GetEmailQuery;