#!/usr/bin/env bash
# 由 systemd 定时器每分钟调用（以 root 运行）：GitHub 上有新提交就拉取并重启程序。
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OWNER="$(stat -c %U "$APP_DIR")"
cd "$APP_DIR" || exit 0
run() { sudo -H -u "$OWNER" "$@"; }
OLD="$(run git rev-parse HEAD)"
run git pull --ff-only -q 2>/dev/null || exit 0
NEW="$(run git rev-parse HEAD)"
if [ "$OLD" != "$NEW" ]; then
  systemctl restart pingyang
  logger -t pingyang-autoupdate "updated $OLD -> $NEW"
fi
