#!sh

pm2-runtime imap_listener_master.js &
sleep 2m
pm2-runtime imap_listener.js -i 1 