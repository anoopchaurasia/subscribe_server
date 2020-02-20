let {
    on_db_connection
  } = require("../base.js");
  
  fm.Include("com.anoop.imap.Controller");
  let ImapController = com.anoop.imap.Controller;
  async function start(offset) {
    let counter = 0;
    const cursor = await ImapController.UserModel.getCursor({
      inactive_at: null,
      email_client: "imap"
    }, {trash_label:1, unsub_label}, offset);

    await cursor.eachAsync(async user => {
      counter++;
        await ImapController.UserModel.updateUserById({
          _id: user._id
        }, {
          $set: {
            unsub_label: user.trash_label || user.unsub_label
          }
    }).catch(async e => {
        console.error("watch error", counter, e);
        if (e.codeName == "CursorNotFound") {
          start(counter);
        }
      })
      .then(() => {
        console.log('done!', counter)
      })
     
    }
  
  }
  on_db_connection(start);
 