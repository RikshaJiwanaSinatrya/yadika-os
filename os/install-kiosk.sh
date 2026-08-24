#!/usr/bin/env bash
#
# Provisioning idempotent untuk VM Arch Linux minimal -> kiosk yadika-os.
# Aman dijalankan ulang: semua langkah bersifat deklaratif/check-first.
#
# Pemakaian (sebagai root, di dalam VM):
#   ./os/install-kiosk.sh
#
# Override opsional (environment):
#   KIOSK_USER=budi        user non-root yang menjalankan sesi kiosk & backend
#   YADIKA_APP_DIR=/srv/x  lokasi instalasi app (default /opt/web-os)
#   YADIKA_PORT=3000       port HTTP backend (default 3000)
set -euo pipefail

KIOSK_USER="${KIOSK_USER:-kiosk}"
APP_DIR="${YADIKA_APP_DIR:-/opt/web-os}"
PORT="${YADIKA_PORT:-3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

log() { printf '\n[yadika-install] %s\n' "$*"; }

die() {
  printf '[yadika-install] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$(id -u)" -eq 0 ]] || die "harus dijalankan sebagai root"
[[ -f "${REPO_DIR}/server/index.mjs" ]] || die "repo tidak ditemukan di ${REPO_DIR}"
command -v pacman >/dev/null 2>&1 || die "script ini hanya untuk Arch Linux"

log "Memastikan paket terpasang: cage chromium nodejs npm git rsync"
pacman -Sy --needed --noconfirm cage chromium nodejs npm git rsync

log "Menyiapkan user '${KIOSK_USER}'"
if ! id "${KIOSK_USER}" >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G video,input "${KIOSK_USER}"
else
  log "User sudah ada, dilewati"
fi

log "Menyalin repo ke ${APP_DIR} (tanpa node_modules/dist/.git/build)"
mkdir -p "${APP_DIR}"
rsync -a --delete \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'build/' \
  --exclude '.git/' \
  "${REPO_DIR}/" "${APP_DIR}/"

log "Build aplikasi web (npm ci && npm run build) sebagai ${KIOSK_USER}"
chown -R "${KIOSK_USER}:${KIOSK_USER}" "${APP_DIR}"
runuser -u "${KIOSK_USER}" -- bash -lc "cd '${APP_DIR}' && npm ci && npm run build"

log "Menyiapkan data dir (sandbox FS API)"
install -d -m 750 -o "${KIOSK_USER}" -g "${KIOSK_USER}" "/home/${KIOSK_USER}/yadika-data"

log "Memasang unit systemd + drop-in autologin"
install -Dm644 "${SCRIPT_DIR}/kiosk/yadika.service" /etc/systemd/system/yadika.service
install -Dm644 "${SCRIPT_DIR}/kiosk/kiosk.service" /etc/systemd/system/kiosk.service
install -Dm644 "${SCRIPT_DIR}/kiosk/getty-autologin.conf" \
  /etc/systemd/system/getty@tty1.service.d/autologin.conf

if [[ "${PORT}" != "3000" ]]; then
  log "Mengubah port backend ke ${PORT}"
  sed -i "s|^Environment=PORT=.*|Environment=PORT=${PORT}|" /etc/systemd/system/yadika.service
  sed -i "s|http://127.0.0.1:3000|http://127.0.0.1:${PORT}|" /etc/systemd/system/kiosk.service
fi

log "Enable service boot: yadika.service, kiosk.service, getty@tty1.service"
systemctl daemon-reload
systemctl enable yadika.service kiosk.service getty@tty1.service

cat <<EOF

=============================================================
Provisioning selesai.

Yang terpasang:
  - App          : ${APP_DIR}
  - Backend      : yadika.service   (port ${PORT}, Restart=always)
  - Kiosk session: kiosk.service    (cage + Chromium di tty1)
  - Autologin    : getty@tty1 (fallback maintenance saat kiosk off)

Langkah berikutnya:
  1. reboot
  2. VM akan boot langsung ke yadika-os fullscreen.

Mode maintenance:
  systemctl disable --now kiosk.service && reboot
  -> tty1 otomatis login sebagai ${KIOSK_USER} (shell biasa).
=============================================================
EOF
