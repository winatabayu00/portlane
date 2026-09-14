# Deploy Ubuntu (single-port 4002, tanpa Docker)

Unit: `deploy/portlane-api.service`, `deploy/portlane-worker.service`.
Env: `/etc/portlane/portlane.env` dari `deploy/portlane.env.example`.

```bash
# 1. user + tree (di server Ubuntu)
sudo useradd -r -m -s /usr/sbin/nologin portlane
sudo mkdir -p /opt/portlane /etc/portlane
sudo cp -r . /opt/portlane && sudo chown -R portlane:portlane /opt/portlane

# 2. env (JANGAN commit terisi)
sudo cp deploy/portlane.env.example /etc/portlane/portlane.env
sudo nano /etc/portlane/portlane.env   # isi DATABASE_URL, REDIS_URL, 2 secret beda
sudo chmod 600 /etc/portlane/portlane.env && sudo chown portlane:portlane /etc/portlane/portlane.env

# 3. build + migrate (DB portlane isolated, bukan ai_engineering_os)
cd /opt/portlane && sudo -u portlane yarn install
sudo -u portlane env $(grep -v '^#' /etc/portlane/portlane.env | xargs) yarn build
sudo -u portlane env $(grep -v '^#' /etc/portlane/portlane.env | xargs) yarn workspace @portlane/api migrate

# 4. unit nyala
sudo cp deploy/portlane-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now portlane-api portlane-worker
curl localhost:4002/health && curl localhost:4002/ready
```
