# 平阳味道餐厅 · 课堂实时点单

英语点餐课堂互动：**10 组 × 4 人**，每组 1 台平板点单（4 个餐盘），机器人对每个餐盘评分，订单实时显示在老师的**大屏订单墙**上。

| 页面 | 地址 | 谁用 |
|---|---|---|
| 学生端 | `/s.html?g=组号`（二维码扫入） | 每组 1 台平板（横屏） |
| 大屏订单墙 | `/wall.html` | 老师的电脑 / 希沃 |
| 入口页 | `/` | 选组号 |

单机版（不联网、4 页完整流程）另存在 `pingyang-order-单机版.html`（不在本仓库）。

## 评分规则
5 星起评：主食 / 肉 / 蔬果三大类缺一类 −2 星；某一类 ≥3 份 −1 星；饮料+甜点合计 >2 份 −1 星。4–5 星机器人笑，2–3 星嘴巴平，0–1 星不开心。评分在**服务器端**重新计算，学生改不了。

## 本地运行（测试）
```bash
node server.js          # 需要 Node.js 18+，无需 npm install
# 浏览器打开 http://localhost:3000/wall.html ，再开 http://localhost:3000/s.html?g=1
```
环境变量：`PORT`（默认 3000）、`GROUPS`（默认 10）、`TEACHER_PASSWORD`（不设则首次启动随机生成，保存在 `data/config.json`，并打印在日志里）。

## 部署到腾讯云服务器
1. **服务器上拉代码**（仓库是私有的，用「部署密钥」只读访问）：
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/pingyang_deploy -N ""
   cat ~/.ssh/pingyang_deploy.pub      # 复制到 GitHub 仓库 → Settings → Deploy keys → Add（只读，不要勾 write）
   GIT_SSH_COMMAND="ssh -i ~/.ssh/pingyang_deploy -o StrictHostKeyChecking=accept-new" \
     git clone git@github.com:wztanhua2035/pingyang-restaurant.git /opt/pingyang-restaurant
   ```
   > 如果服务器访问 GitHub 很慢，可改用 Gitee 镜像或把代码打包上传。
2. **一键安装**：`cd /opt/pingyang-restaurant && DOMAIN=你的子域名 bash deploy/install.sh`
3. 域名解析：在 DNS 里给该子域名加一条 **A 记录** 指向服务器公网 IP。腾讯云安全组放行 **80（和 443）** 端口。
4. 之后更新：`bash /opt/pingyang-restaurant/deploy/update.sh`（普通账号运行即可）

## 上课流程
1. 课前打开大屏 `/wall.html` → 右上角「教师登录」输入密码 → 「二维码」把 10 个二维码投出来或打印。
2. 学生扫码进入本组 → 4 位同学轮流点餐 → 全部点完按「Place order」。
3. 大屏实时出现订单与机器人评分；老师点星给每组「Fluent dialogue / Correct expression」打 1–3 星，平板上同步显示。
4. 「锁定点单」可暂停所有平板；「下一轮」清空全部数据开始新一轮。

## 隐私
只记录组号和菜品，不收集姓名等个人信息。状态保存在服务器 `data/state.json`（已在 `.gitignore` 中，不会上传 GitHub）。
