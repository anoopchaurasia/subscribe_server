fm.Package("com.jeet.memdb");
fm.Class("RedisDB>com.anoop.vendor.Redis", function(me) {
    this.setMe=_me=>me=_me;
    Static.findPercent = function(data, is_completed=true){
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
        return ((unread * 100) / count) > 80 && (count>=3 || (is_completed && count>=6)) ;
    };

    function createKey(user_id, from_email){
        return user_id + '-' + from_email;
    }

    Static.pushData = function(user_id, from_email, data) {
        me.base.pushData(createKey(user_id, from_email), data);
    };

    Static.pushFlag= function(user_id, keyword, data) {
        me.base.pushData(createKey(keyword,user_id), data);
    };

    Static.getKEYS = function(user_id){
        return me.base.getKEYS(createKey(user_id,'*'));
    }

    Static.getFinishKey = function(key){
        return me.base.getKEYS(key);
    }
    
});