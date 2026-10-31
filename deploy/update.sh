#!/usr/bin/env bash
# 更新到 GitHub 上的最新版本并重启。用普通账号（如 ubuntu）运行即可，重启时会用 sudo。
set -e
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
git pull --ff-only
sudo systemctl restart pingyang
sleep 1
systemctl is-active pingyang && echo "已更新并重启 ✔"
