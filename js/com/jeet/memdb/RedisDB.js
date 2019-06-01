fm.Package("com.jeet.memdb");
fm.Class("RedisDB>com.anoop.vendor.Redis", function(me) {
    this.setMe=_me=>me=_me;
    Static.findPercent = function(data){
        var unread = 0;
        var read = 0;
        var count = 0;
        data.forEach(mailObj => {
            count++;
            mailObj = JSON.parse(mailObj);
            if (mailObj.labelIds.includes("UNREAD")) {
                unread++;
            } else {
                read++;
            }
        });
        return ((unread * 100) / count) > 90;
    };

    function createKey(user_id, from_email){
        return user_id + '-' + from_email;
    }

    Static.pushData = function(user_id, from_email, data) {
        me.base.pushData(createKey(user_id, from_email), data);
    };

    Static.getKEYS = function(user_id){
        return me.base.getKEYS(createKey(user_id,'*'));
    }
    
});