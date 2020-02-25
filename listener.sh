#!/bin/sh

pm2-runtime imap_listener_master.js &
sleep 30
pm2-runtime imap_listener.js -i 100
