fm.Package("com.anoop.model");
fm.Class("BaseModel", function(me){
    this.setMe=_me=>me=_me;

    Static.updateQueryValidation = function(query, custome_key){
        if(!(query._id || query.user_id || query[custome_key])) throw new Error("_id or user id require for update");
    };

    Static.getDate = function(date_str) {
        if(!date_str) {
            console.warn("date not provided",date_str);
            return null;
        }
        var date = new Date(date_str);
        if(date.toString() === "Invalid Date") {
            let parse_date = require("chrono-node").parseDate(date_str)
            date = parse_date && new Date(parse_date.toString());
        }
        if(date==="Invalid Date") {
            date = null;
        }
        return date;
    }
    
});