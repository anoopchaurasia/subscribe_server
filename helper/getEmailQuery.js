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
                    console.error(err.message, err.stack);
                })
            })
        }
        return senddata;
    }

    /*
        This function will return all unread subscription Information.
    */
    static async getUnreadEmail(user_id) {

        const emails = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "status": "unused", "user_id": user_id } },
        { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
        { $project: { "count": 1 } }]).catch(err => {
            console.error(err.message, err.stack);
        });
        return emails;
    }

    /*
        This function will return all unread subscription Information.
    */
    static async getUnreadEmailData(user_id) {
        const emails = await email.find({ "status": "unused", "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let mailInfo = {};
        let count;
        for (let i = 0; i < emails.length; i++) {
            count = await emailInformation.countDocuments({ "labelIds": "UNREAD", "from_email_id": emails[i]._id }).catch(err => {
                console.error(err.message, err.stack);
            });
            mailInfo[emails[i].from_email] = count
        }
        console.log(mailInfo)
        return mailInfo;
    }


    /*
        This function will return all unread moved subscription Information.
    */
    static async getUnreadMovedEmail(user_id) {
        const emails = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "status": "move", "user_id": user_id } },
        { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
        { $project: { "count": 1 } }]).catch(err => {
            console.error(err.message, err.stack);
        });
        return emails;
    }

    /*
        This function will return Total Email Count for particular user.
    */
    static async getTotalEmailCount(user_id) {
    
        let totalNL = await email.find({ "user_id": user_id }).catch(err => {
            console.error(err.message, err.stack);
        });
        let total = 0;
        let count = 0;
        for (let i = 0; i < totalNL.length; i++) {
            count = await emailInformation.countDocuments({ 'from_email_id': totalNL[i]._id }).catch(err => {
                console.error(err.message, err.stack);
            });
            total = total + count;
        }
        return total;
    }

    /*
        This function will return Total Unsubscribe Email count for particular User
    */
    static async getTotalUnsubscribeEmailCount(user_id) {
        let totalNL = await email.find({ "user_id": user_id, "status": "move" }).catch(err => {
            console.error(err.message, err.stack);
        });
        let total = 0;
        let count = 0;
        for (let i = 0; i < totalNL.length; i++) {
            count = await emailInformation.countDocuments({ 'from_email_id': totalNL[i]._id }).catch(err => {
                console.error(err.message, err.stack);
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
            console.error(err.message, err.stack);
        });
        return emails;
    }


    /*
        This function will return all moved subscription list for particular user.
    */
    static async getAllMovedSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "status": "move", "user_id": user_id } }, {
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
            console.error(err.message, err.stack);
        });
        return emails;
    }

    /*
        This function will return All keeped subscription List for particular user.
    */
    static async getAllKeepedSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "status": "keep", "user_id": user_id } }, {
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
            console.error(err.message, err.stack);
        });
        return emails;
    }

    /*
        This function will return Unread Keeped subscription information.
    */
    static async getUnreadKeepedEmail(user_id) {
        const emails = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "status": "keep", "user_id": user_id } },
        { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
        { $project: { "count": 1 } }]).catch(err => {
            console.error(err.message, err.stack);
        });
        return emails;
    }

    /*
        This function will return All Trash Subscription Information for particular User.
    */
    static async getAllTrashSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "status": "trash", "user_id": user_id } }, {
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
            console.error(err.message, err.stack);
        });
        return emails;
    }
}


exports.GetEmailQuery = GetEmailQuery;