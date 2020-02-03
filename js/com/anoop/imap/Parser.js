fm.Package("com.anoop.imap");
fm.Import("com.anoop.model.BaseModel")
fm.Class("Parser>.Message", function (me, BaseModel) {
    this.setMe = _me => me = _me;
    function parseHeaderLines(list) {
        let key_value = {};
        list.forEach(x => {
            key_value[x.key] = x.line;
        })
        return key_value;
    }

    Static.getEmailBody = function (parse, labels) {
        let header = parseHeaderLines(parse.headerLines);
        let from_email_name = parse.from.text;
        let from = parse.from.text.indexOf("<") != -1 ? parse.from.text.split("<")[1].replace(">", "") : header.from.text;
        return {
            header,
            payload: parse.html || "",
            email_id: parse.uid,
            labelIds: labels,
            from_email_name: from_email_name,
            from_email: from,
            subject: parse.subject,
            size: parse.size
        };
    };


    Static.parse = function (body, parse, user) {
        // console.log(parse.date)
        let date = BaseModel.getDate(parse.date || (body.header && body.header.date && body.header && body.header.date.split('Date: ')[1]), user);
        return {
            html: body.payload,
            date: date && date.toString(),
            headers: {
                Subject: body.subject,
                From: body.from_email
            },
            history_id: parse.id,
            timestamp: date && date.getTime(),
            subject: body.subject,
            from: body.from_email,
            id: parse.uid,
            to: user.email
        }
    };
});