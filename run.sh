#Bash script to start a TMUX session on the raspberry PI
sudo tmux new -s "smartlock" -c sudo node /srv/smartlock/index.js