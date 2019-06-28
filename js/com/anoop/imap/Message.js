fm.Package("com.anoop.imap");
fm.Class("Message", function(me){
    this.setMe=_me=>me=_me;
   
    Static.search
   
    Static.getAllEmailIdList = async function (imap, from_email){
        return await search(imap, [["FROM", from_email]]);
    };


    async function search(imap, criteria) {
        return new Promise((resolve, reject) => {
            imap.search(criteria, function (err, uids) {
                (err ? reject(err) : resolve(uids));
            });
        });
    };

    Static.changeFolder = async function(ids, folder_name){
        return await new Promise((resolve, reject) => {
            imap.move(ids, folder_name, function (err) {
                (err ? reject(err) : resolve());
            });
        });
    };

    Static.getEmailsBySender = async function(gmail, sender, formatted_date){
        
    };



    Static.getBatchMessage = async function(gmail, message_ids) {
       
    };

    function getBatch(access_token) {
        
    };
    
})