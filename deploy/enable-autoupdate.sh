#!/usr/bin/env bash
# 开启「推送到 GitHub 后约 1 分钟内自动部署」。用法： sudo bash deploy/enable-autoupdate.sh
# 关闭：sudo systemctl disable --now pingyang-autoupdate.timer
set -e
[ "$(id -u)" = "0" ] || { echo "请用 sudo 运行"; exit 1; }
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$APP_DIR/deploy/autopull.sh"
cat > /etc/systemd/system/pingyang-autoupdate.service <<UNIT
[Unit]
Description=Pingyang auto update from GitHub
[Service]
Type=oneshot
ExecStart=$APP_DIR/deploy/autopull.sh
UNIT
cat > /etc/systemd/system/pingyang-autoupdate.timer <<UNIT
[Unit]
Description=Pingyang auto update timer
[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now pingyang-autoupdate.timer
echo "已开启自动更新：推送到 GitHub main 分支后约 1 分钟内自动部署。"
echo "上课期间想暂停：sudo systemctl stop pingyang-autoupdate.timer ；下课再 start。"
