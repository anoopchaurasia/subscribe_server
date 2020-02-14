let {
  on_db_connection
} = require("../base.js");

fm.Include("com.anoop.imap.Controller");
let ImapController = com.anoop.imap.Controller;
let ObjectId = require("mongoose").Types.ObjectId;
let cluster = require("cluster");
async function start(offset) {
  let counter = 0;
  const cursor = await ImapController.UserModel.getCursor({
    inactive_at: null,
    trash_label: null,
    email_client: "imap"
  }, {}, offset);
  let arr = [];
  await cursor.eachAsync(async user => {
    arr.push(user);
    }).catch(async e => {
      console.error("watch error", counter, e);
      if (e.codeName == "CursorNotFound") {
        start(counter);
      }
    })
    .then(() => {
      console.log('done!', arr.length)
    })
    for(let i=0; i< 10; i++) {
      let worker  = cluster.fork();
      worker.on("message", ()=>{
      counter++;
      counter %50 ==0  && console.log("counter", counter);
      if(arr.length===0) return;
      worker.send(arr.shift());
    });
    counter++;
    worker.send(arr.shift());
  }

}
if (cluster.isMaster) {
  on_db_connection(start);
} else {
  process.on("message", async user=>{
    try {
      if(!user) return console.log("no data", process.worker._id);
      await handleUser(user);
    } catch (e) {
      console.error(e);
    }
    finally {
      process.send("give me more");
    }
  })
}

async function closeImap(myImap) {
  await myImap.closeFolder();
  myImap.end();
}

async function handleUser(user) {
  user._id = new ObjectId(user._id);
  let myImap = await ImapController.openFolder(user, "INBOX");
  if(myImap.provider.provider=="gmail") return;
  let labels = await myImap.getLabels();
  let newlabels = await ImapController.storeLabelData(labels, myImap.provider.provider);
  console.log(user,  newlabels);
  let db_labels = await ImapController.getDBLabels(labels, myImap.provider.provider);
  if (user.trash_label !== db_labels.trash_label && db_labels.trash_label) {
    await ImapController.UserModel.updateUserById({
      _id: user._id
    }, {
      $set: {
        trash_label: db_labels.trash_label
      }
    })
  }
  await closeImap(myImap);
}