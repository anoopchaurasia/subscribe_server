let {on_db_connection} = require("../base.js");
on_db_connection(start);

fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
async function start(offset) {
    let counter = 0;
    const cursor = await ImapController.UserModel.getCursor({
        "email_client": "imap",
        email: "someshy.com@gmail.com"
      }, {}, offset);
      cursor.eachAsync(async user => {
          await handleUser(user);
          counter++;
        }).catch(async e => {
          console.error("watch error", counter, e);
          if (e.codeName == "CursorNotFound") {
            start(counter);
          }
        })
        .then(() => {
          console.log('done!')
        })
}

async function closeImap(myImap) {
    await myImap.closeFolder();
    myImap.end();
}

async function handleUser(user) {
    console.log(user);
    let myImap = await ImapController.openFolder(user, "INBOX");
    let labels = await myImap.getLabels();
    await ImapController.storeLabelData(labels, myImap.provider.provider);
    let db_labels = await ImapController.getDBLabels(labels);
    if(user.trash_label !== db_labels.trash_label && db_labels.trash_label) {
        await ImapController.UserModel.updateUserById({_id: user._id}, {$set: {trash_label: db_labels.trash_label}})
    }
    await closeImap(myImap);
}