To auto-start:

1. Systemd, to run a script which does a git pull

sudo nano /lib/systemd/system/gitpull.service
nano /home/pi/Scripts/startup.sh
sudo systemctl status gitpull.service

2. Systemd, to run the server

sudo nano /lib/systemd/system/magicmirror.service
sudo systemctl status magicmirror.service

3. LDXE-pi, to run the browser

sudo nano /home/pi/.config/lxsession/LXDE-pi/autostart

https://www.dexterindustries.com/howto/run-a-program-on-your-raspberry-pi-at-startup/

https://docs.magicmirror.builders/configuration/autostart.html#using-systemd-systemctl