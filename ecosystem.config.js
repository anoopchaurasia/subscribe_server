module.exports = {
    apps : [{
      name: "app",
      script: "./app.js",
      exec_mode  : "cluster",
      instances: 3
    },
    {
        name: "qc_action",
        script: "./qc_action.js",
        exec_mode  : "cluster",
        instances: 7
      },
      {
        name: "process",
        script: "./process.js",
        exec_mode  : "cluster",
        instances: 8
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