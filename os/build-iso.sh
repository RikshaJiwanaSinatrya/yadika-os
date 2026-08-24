#!/usr/bin/env bash
#
# Build custom ISO yadika-os (archiso, strategi delta-overlay di atas releng).
#
# Yang dilakukan:
#   1. salin profil releng bawaan paket archiso -> build/iso/profile
#   2. gabungkan delta os/archiso/ (paket ekstra, sysusers, tmpfiles)
#   3. pasang unit systemd dari os/kiosk/ + symlink enable
#   4. build web app (npm ci && npm run build) DI DALAM chroot agar
#      node-pty (native module) dikompilasi untuk lingkungan yang sama
#      dengan ISO, lalu tanam ke airootfs/opt/web-os
#   5. mkarchiso -v -w work -o out profile
#
# Pemakaian (host Arch Linux, sebagai root):
#   sudo ./os/build-iso.sh
#
# Override opsional:
#   YADIKA_ISO_BUILD_DIR=/path   lokasi kerja build (default <repo>/build/iso)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DELTA_DIR="${REPO_DIR}/os/archiso"
KIOSK_DIR="${REPO_DIR}/os/kiosk"
BUILD_ROOT="${YADIKA_ISO_BUILD_DIR:-${REPO_DIR}/build/iso}"
WORK="${BUILD_ROOT}/work"
OUT="${BUILD_ROOT}/out"
PROFILE="${BUILD_ROOT}/profile"
CHROOT="${BUILD_ROOT}/chroot"

log() { printf '\n[yadika-iso] %s\n' "$*"; }
die() {
  printf '[yadika-iso] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$(id -u)" -eq 0 ]] || die "harus dijalankan sebagai root (pacstrap/mkarchiso)"
[[ -f /etc/arch-release ]] || die "build ISO hanya didukung pada host Arch Linux"
command -v pacman >/dev/null 2>&1 || die "pacman tidak ditemukan"

log "Memasang archiso + rsync"
pacman -Sy --needed --noconfirm archiso rsync

RELENG="${YADIKA_RELENG_DIR:-/usr/share/archiso/configs/releng}"
[[ -d "${RELENG}" ]] || die "profil releng tidak ditemukan di ${RELENG}"

rm -rf "${PROFILE}" "${CHROOT}"
mkdir -p "${BUILD_ROOT}" "${WORK}" "${OUT}"

log "Menyalin profil dasar releng"
cp -a "${RELENG}/" "${PROFILE}/"

log "Menambahkan paket ekstra: $(tr '\n' ' ' <"${DELTA_DIR}/packages.extra")"
for candidate in packages.x86_64 packages.both; do
  if [[ -f "${PROFILE}/${candidate}" ]]; then
    cat "${DELTA_DIR}/packages.extra" >>"${PROFILE}/${candidate}"
  fi
done

log "Menggabungkan overlay airootfs (sysusers, tmpfiles)"
cp -a "${DELTA_DIR}/airootfs/." "${PROFILE}/airootfs/"

log "Memasang unit yadika + drop-in autologin ke dalam profil"
install -Dm644 "${KIOSK_DIR}/yadika.service" \
  "${PROFILE}/airootfs/etc/systemd/system/yadika.service"
install -Dm644 "${KIOSK_DIR}/kiosk.service" \
  "${PROFILE}/airootfs/etc/systemd/system/kiosk.service"
install -Dm644 "${KIOSK_DIR}/getty-autologin.conf" \
  "${PROFILE}/airootfs/etc/systemd/system/getty@tty1.service.d/autologin.conf"

WANTS="${PROFILE}/airootfs/etc/systemd/system/multi-user.target.wants"
install -d "${WANTS}"
ln -sfn ../yadika.service "${WANTS}/yadika.service"
ln -sfn ../kiosk.service "${WANTS}/kiosk.service"

log "Menyalin repo untuk build chroot"
mkdir -p "${CHROOT}"
rsync -a \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'build/' \
  --exclude 'os/' \
  --exclude '.git/' \
  "${REPO_DIR}/" "${CHROOT}/app/"

log "Pacstrap chroot build: base nodejs npm gcc make python"
pacstrap -c "${CHROOT}" base nodejs npm gcc make python

log "Build web app di dalam chroot (node-pty dikompilasi native untuk ISO)"
arch-chroot "${CHROOT}" /bin/bash -euc 'cd /app && npm ci && npm run build'

log "Menanam app hasil build ke ${PROFILE}/airootfs/opt/web-os"
rm -rf "${PROFILE}/airootfs/opt/web-os"
mkdir -p "${PROFILE}/airootfs/opt"
cp -a "${CHROOT}/app" "${PROFILE}/airootfs/opt/web-os"
chown -R root:root "${PROFILE}/airootfs/opt/web-os"

if grep -q '^iso_name=' "${PROFILE}/profiledef.sh"; then
  sed -i 's/^iso_name=.*/iso_name="yadika-os"/' "${PROFILE}/profiledef.sh"
fi

log "mkarchiso -v -w work -o out"
cd "${REPO_DIR}"
mkarchiso -v -w "${WORK}" -o "${OUT}" "${PROFILE}"

log "Membersihkan chroot build"
rm -rf "${CHROOT}"

cat <<EOF

=============================================================
Build ISO selesai.

Hasil     : ${OUT}/*.iso
Uji cepat : qemu-system-x86_64 -m 4096 -cdrom ${OUT}/yadika-os-*.iso

Catatan:
  - build/iso/work dipertahankan agar rebuild berikutnya lebih cepat;
    hapus manual bila ingin memulai dari nol.
  - node_modules ikut tertanam di dalam squashfs; node-pty sudah
    dikompilasi di chroot yang sama dengan lingkungan live ISO.
=============================================================
EOF
