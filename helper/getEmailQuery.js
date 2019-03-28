'use strict'
const email = require('../models/email');

class GetEmailQuery {

    static async getAllFilteredSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "is_trash": false, "is_moved": false, "is_keeped": false, "is_delete": false, "user_id": user_id } }, {
            $group: {
                _id: { "from_email": "$from_email" }, data: {
                    $push: {
                        "labelIds": "$labelIds",
                        "subject": "$subject",
                        "url": "$unsubscribe",
                        "email_id": "$email_id",
                        "history_id": "$historyId",
                        "from_email_name": "$from_email_name"
                    }
                }, count: { $sum: 1 }
            }
        }, { $sort: { "count": -1 } }, { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }

    static async getUnreadEmail(user_id) {
        const emails = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "is_trash": false, "is_keeped": false, "is_moved": false, "user_id": user_id } },
        { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
        { $project: { "count": 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }

    static async getUnreadMovedEmail(user_id) {
        const emails = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "is_keeped": false, "is_moved": true, "user_id": user_id } },
        { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
        { $project: { "count": 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }

    static async getTotalEmailCount(user_id) {
        const total = await email.countDocuments({ 'user_id': user_id }).catch(err => {
            console.log(err);
        });
        return total;
    }

    static async getTotalUnsubscribeEmailCount(user_id) {
        const total = await email.countDocuments({ "user_id": user_id, "is_moved": true, "is_delete": false, "is_keeped": false }).catch(err => {
            console.log(err);
        });
        return total;
    }

    static async getAllSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "user_id": user_id } }, {
            $group: {
                _id: { "from_email": "$from_email" }, data: {
                    $push: {
                        "labelIds": "$labelIds",
                        "subject": "$subject",
                        "url": "$unsubscribe",
                        "email_id": "$email_id",
                        "history_id": "$historyId",
                        "from_email_name": "$from_email_name"
                    }
                }, count: { $sum: 1 }
            }
        },
        { $sort: { "count": -1 } },
        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }

    static async getAllMovedSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "is_moved": true, "is_delete": false, "is_keeped": false, "user_id": user_id } }, {
            $group: {
                _id: { "from_email": "$from_email" }, data: {
                    $push: {
                        "labelIds": "$labelIds",
                        "subject": "$subject",
                        "url": "$unsubscribe",
                        "email_id": "$email_id",
                        "history_id": "$historyId",
                        "from_email_name": "$from_email_name"
                    }
                }, count: { $sum: 1 }
            }
        },
        { $sort: { "count": -1 } },
        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }

    static async getAllKeepedSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "is_keeped": true, "user_id": user_id } }, {
            $group: {
                _id: { "from_email": "$from_email" }, data: {
                    $push: {
                        "labelIds": "$labelIds",
                        "subject": "$subject",
                        "url": "$unsubscribe",
                        "email_id": "$email_id",
                        "history_id": "$historyId",
                        "from_email_name": "$from_email_name"
                    }
                }, count: { $sum: 1 }
            }
        },
        { $sort: { "count": -1 } },
        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }

    static async getUnreadKeepedEmail(user_id) {
        const emails = await email.aggregate([{ $match: { $text: { $search: "UNREAD" }, "is_keeped": true, "is_moved": false, "user_id": user_id } },
        { $group: { _id: { "from_email": "$from_email" }, count: { $sum: 1 } } },
        { $project: { "count": 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }

    static async getAllTrashSubscription(user_id) {
        const emails = await email.aggregate([{ $match: { "is_trash": true, "is_delete": false, "user_id": user_id } }, {
            $group: {
                _id: { "from_email": "$from_email" }, data: {
                    $push: {
                        "labelIds": "$labelIds",
                        "subject": "$subject",
                        "url": "$unsubscribe",
                        "email_id": "$email_id",
                        "history_id": "$historyId",
                        "from_email_name": "$from_email_name"
                    }
                }, count: { $sum: 1 }
            }
        },
        { $sort: { "count": -1 } },
        { $project: { "labelIds": 1, "count": 1, "subject": 1, data: 1 } }]).catch(err => {
            console.log(err);
        });
        return emails;
    }
}


exports.GetEmailQuery = GetEmailQuery;