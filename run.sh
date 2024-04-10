sudo tmux new -s "camera" -c sudo libcamera-vid -t 0 --inline --listen -o tcp://127.0.0.1:9876
sudo tmux new -s "smartlock" -c sudo node /srv/smartlock/index.js