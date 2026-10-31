#!/usr/bin/env bash
# 平阳味道餐厅 · 服务器一键安装（Ubuntu / Debian / CentOS / OpenCloudOS 均可）
# 用法（以 root 运行）：   DOMAIN=order.wzpy.net bash deploy/install.sh
# 说明：本程序零依赖，只需要 Node.js 18+。脚本会：检查/安装 Node → 建 systemd 服务 → （可选）配置 Nginx。
set -e
[ "$(id -u)" = "0" ] || { echo "请用 root 运行（sudo -i 后再执行）"; exit 1; }
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-}"

# ---------- 1. Node.js ----------
need_node=1
if command -v node >/dev/null 2>&1; then
  v=$(node -v | sed 's/v//;s/\..*//'); [ "$v" -ge 18 ] && need_node=0
fi
if [ "$need_node" = "1" ]; then
  echo ">> 安装 Node.js 20（使用国内镜像 npmmirror）"
  NV=v20.18.0
  cd /tmp
  curl -fSL "https://registry.npmmirror.com/-/binary/node/${NV}/node-${NV}-linux-x64.tar.xz" -o node.tar.xz
  mkdir -p /usr/local/lib/nodejs && tar -xJf node.tar.xz -C /usr/local/lib/nodejs
  ln -sf /usr/local/lib/nodejs/node-${NV}-linux-x64/bin/node /usr/local/bin/node
  ln -sf /usr/local/lib/nodejs/node-${NV}-linux-x64/bin/npm /usr/local/bin/npm
fi
echo ">> Node 版本：$(node -v)"
NODE_BIN="$(command -v node)"

# ---------- 2. 运行账号与目录权限 ----------
id pingyang >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin pingyang
mkdir -p "$APP_DIR/data" && chown -R pingyang:pingyang "$APP_DIR/data"

# ---------- 3. systemd 服务 ----------
cat > /etc/systemd/system/pingyang.service <<UNIT
[Unit]
Description=Pingyang Restaurant classroom server
After=network.target

[Service]
User=pingyang
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
ExecStart=$NODE_BIN $APP_DIR/server.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable pingyang >/dev/null 2>&1
systemctl restart pingyang
sleep 1
systemctl --no-pager --lines=8 status pingyang || true

# ---------- 4. Nginx（可选：填了 DOMAIN 才配置） ----------
if [ -n "$DOMAIN" ]; then
  if ! command -v nginx >/dev/null 2>&1; then
    echo ">> 未检测到 Nginx，请先安装（Ubuntu: apt install -y nginx；CentOS: yum install -y nginx），再重新运行本脚本。"
  else
    CONF_DIR=/etc/nginx/conf.d; mkdir -p $CONF_DIR
    sed "s/__DOMAIN__/$DOMAIN/g;s/__PORT__/$PORT/g" "$APP_DIR/deploy/nginx.conf.example" > $CONF_DIR/pingyang.conf
    nginx -t && systemctl reload nginx && echo ">> Nginx 已配置：http://$DOMAIN"
  fi
fi

echo
echo "================ 完成 ================"
echo "本机测试： curl http://127.0.0.1:$PORT/api/info"
echo "教师操作：默认无需密码（大屏直接可用）；如需密码，在 systemd 服务里加 Environment=TEACHER_PASSWORD=你的密码"
echo "大屏：     http://${DOMAIN:-服务器IP:$PORT}/wall.html"
echo "更新代码： bash $APP_DIR/deploy/update.sh"
