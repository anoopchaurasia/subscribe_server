module.exports = {
    apps : [{
      name: "app",
      script: "./app.js",
      exec_mode  : "cluster",
      instances: 7
    },
    {
        name: "qc_action",
        script: "./qc_action.js",
        exec_mode  : "cluster",
        instances: 5
      },
      {
        name: "process",
        script: "./process.js",
        exec_mode  : "cluster",
        instances: 25
      },
      {
        name: "db_user_action",
        script: "./db_user_action.js",
        exec_mode  : "cluster",
        instances: 10
      },{
        name: "imap_user_action",
        script: "./imap_user_action.js",
        exec_mode  : "cluster",
        instances: 10
      }]
  }