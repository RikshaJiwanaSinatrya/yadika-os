# yadika-os — Artefak OS (kiosk + distro)

Folder ini berisi semua artefak untuk menjadikan yadika-os sebagai OS sungguhan
berbasis Arch Linux: kiosk mode di VM, FS API + apps nyata di repo, dan custom
ISO via archiso.

```
os/
├── README.md              <- file ini
├── install-kiosk.sh       <- provisioning idempotent VM Arch -> kiosk yadika-os
├── build-iso.sh           <- build custom ISO (archiso, delta-overlay releng)
├── kiosk/
│   ├── yadika.service         backend: node server/index.mjs @ :3000, Restart=always
│   ├── kiosk.service          sesi kiosk: cage + Chromium --kiosk di tty1
│   └── getty-autologin.conf   drop-in autologin getty@tty1 (mode maintenance)
└── archiso/               <- delta-overlay profil archiso (lihat bagian ISO)
```

## Arsitektur boot (kiosk mode)

```
UEFI -> systemd -> multi-user.target
                    ├── yadika.service  (node /opt/web-os/server/index.mjs, :3000)
                    └── kiosk.service   (cage -s -- chromium --kiosk ... di tty1)
                            └── Conflicts=getty@tty1 (mengambil alih tty1)

getty@tty1 + autologin drop-in = fallback: boot ke shell user kiosk
                                 saat kiosk.service dimatikan.
```

- `yadika.service` berjalan sebagai user biasa (`kiosk`, dibuat oleh installer).
- `kiosk.service` memakai pola `PAMName=login` + `TTYPath=/dev/tty1` sehingga
  logind membuat sesi seat0 yang sah — cage/wlroots bisa ambil DRM & input.
  Chromium crash → cage exit → `Restart=always` menyalakan sesi lagi.

---

## 1. Membuat VM Arch minimal (manual, QEMU)

Spesifikasi target: **20 GB disk qcow2, 4 GB RAM, UEFI (OVMF)**. Host diasumsikan
Arch Linux dengan `qemu-full` (atau `qemu-desktop`) terpasang.

### 1.1 Buat disk & jalankan installer

```sh
cd ~/vm
qemu-img create -f qcow2 arch-yadika.qcow2 20G

cp /usr/share/edk2/x64/OVMF_VARS.4M.fd .

qemu-system-x86_64 \
  -machine q35,accel=kvm -cpu host -smp 2 -m 4096 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4M.fd \
  -drive if=pflash,format=raw,file=$PWD/OVMF_VARS.4M.fd \
  -drive file=arch-yadika.qcow2,if=virtio,format=qcow2 \
  -cdrom archlinux-x86_64.iso \
  -netdev user,id=n0 -device virtio-net-pci,netdev=n0 \
  -display gtk,gl=off
```

> Tanpa KVM (misal host lain): ganti `-machine q35,accel=kvm -cpu host` menjadi
> `-machine q35,accel=tcg`. Boot akan lambat tapi tetap jalan.
> Path OVMF bisa berbeda per distro (`/usr/share/OVMF/x64/...` pada Debian/Ubuntu).

Di layar boot Arch pilih entri **UEFI** (bukan BIOS legacy). Masuk live shell,
lalu install minimal:

```sh
loadkeys us                       # atau id
timedatectl set-ntp true

# partisi: 1 ESP 512M + sisanya root
sgdisk --clear -n 1:0:+512M -t 1:ef00 -n 2:0:0 /dev/vda
mkfs.fat -F32 /dev/vda1
mkfs.ext4 /dev/vda2

mount /dev/vda2 /mnt
mount --mkdir /dev/vda1 /mnt/boot

pacstrap -K /mnt base linux linux-firmware grub efibootmgr sudo git \
  networkmanager openssh
genfstab -U /mnt >> /mnt/etc/fstab

arch-chroot /mnt
ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
hwclock --systohc
echo yadika-vm > /etc/hostname
passwd                                        # password root
useradd -m -G wheel -s /bin/bash admin && passwd admin
sed -i 's/^# %wheel ALL=(ALL:ALL) ALL/%wheel ALL=(ALL:ALL) ALL/' /etc/sudoers

grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB
grub-mkconfig -o /boot/grub/grub.cfg

systemctl enable NetworkManager sshd
exit && umount -R /mnt && reboot
```

Eject ISO setelah instalasi (matikan VM, hapus baris `-cdrom` saat start lagi).

### 1.2 Memindahkan repo ke dalam VM

Pilih salah satu:

**a) scp dari host** (paling simpel; sshd sudah aktif):

```sh
# di host, cari IP VM (login dulu lewat jendela qemu)
rsync -a --exclude node_modules --exclude .git --exclude dist --exclude build \
  ~/web-os/ admin@<IP_VM>:~/web-os/
```

**b) 9p shared folder** — tambahkan opsi ini saat menjalankan qemu:

```
-virtfs local,path=/home/riksha/web-os,mount_tag=hostrepo,security_model=mapped
```

lalu di VM: `mount -t 9p hostrepo /mnt/hostrepo`.

**c) git clone** jika repo ada di remote.

### 1.3 Provisioning

```sh
sudo ./os/install-kiosk.sh     # dari root repo di dalam VM
sudo reboot
```

Selesai. VM akan boot langsung ke yadika-os fullscreen (Chromium kiosk via cage).

### 1.4 Verifikasi

| Yang dicek | Cara |
| --- | --- |
| Backend hidup | `systemctl status yadika` ; `curl -s localhost:3000 \| head` |
| Sesi kiosk hidup | `systemctl status kiosk` ; layar menampilkan desktop yadika-os |
| Terminal app | buka Start → Terminal → shell asli via `/pty` |
| File Explorer | buka Start → Files → buat folder/file; cek di `/home/kiosk/yadika-data` |
| Crash recovery | `pkill chromium` → sesi kiosk restart sendiri |
| Boot loop kembali | `sudo systemctl is-enabled kiosk` = enabled |

### 1.5 Maintenance

```sh
# keluar dari kiosk ke shell autologin:
sudo systemctl disable --now kiosk.service && sudo reboot

# kembali ke kiosk:
sudo systemctl enable --now kiosk.service      # atau reboot
```

Log: `journalctl -u yadika -f`, `journalctl -u kiosk -f`.

### Catatan desain

- Port dapat diubah dengan `YADIKA_PORT=3001 sudo -E ./os/install-kiosk.sh`
  (unit yadika dan URL Chromium ikut disesuaikan).
- `getty-autologin.conf` sengaja tetap terpasang walau kiosk aktif: unit
  `kiosk.service` mengambil alih tty1 lewat `Conflicts=getty@tty1`, sehingga
  drop-in hanya berefek saat kiosk dinonaktifkan.
- Hardening systemd sengaja dibuat minimal agar `node-pty` (spawn shell +
  alokasi pty) tetap bekerja normal.

---

## 2. Custom ISO (archiso)

ISO dibangun dengan strategi **delta-overlay**: `os/archiso/` hanya berisi
perubahan di atas profil `releng` bawaan paket `archiso`. Saat build,
`os/build-iso.sh` menyalin releng lalu menggabungkan delta — sehingga tahan
terhadap pembaruan struktur profil archiso.

```
os/archiso/
├── packages.extra                              # ditambahkan ke packages.x86_64/both releng:
│                                               #   nodejs, cage, chromium, ttf-dejavu
└── airootfs/
    ├── etc/sysusers.d/yadika-kiosk.conf        # membuat user kiosk (home /home/kiosk)
    └── etc/tmpfiles.d/yadika-kiosk.conf        # membuat /home/kiosk + yadika-data saat boot

Unit systemd & drop-in autologin TIDAK diduplikasi di sini — build-iso.sh
memasangnya langsung dari os/kiosk/ (sumber tunggal), plus symlink enable
di multi-user.target.wants.
```

### 2.1 Build

Jalankan di host Arch Linux x86_64 (host fisik atau VM Arch) sebagai root:

```sh
cd web-os
sudo ./os/build-iso.sh
```

Yang dilakukan script:

1. Salin `/usr/share/archiso/configs/releng` → `build/iso/profile`.
2. Tambah isi `packages.extra`, gabungkan overlay airootfs, pasang unit dari
   `os/kiosk/`, buat symlink `multi-user.target.wants/{yadika,kiosk}.service`.
3. Buat chroot (`pacstrap base nodejs npm gcc make python`) lalu jalankan
   `npm ci && npm run build` **di dalam chroot** — ini penting karena
   `node-pty` adalah native module: binary `.node` yang dikompilasi harus
   cocok dengan glibc/kernel lingkungan live ISO.
4. Tanam hasil build (termasuk `node_modules`) ke
   `profile/airootfs/opt/web-os`, lalu `mkarchiso -v -w work -o out`.

Hasil: `build/iso/out/yadika-os-<versi>-x86_64.iso`.

> Kebutuhan: ~15 GB ruang disk kosong, koneksi internet (pacman + npm),
> dan kemampuan membuat loop device (jangan dijalankan di dalam container
> tanpa privilege). `build/iso/work` dipertahankan agar rebuild cepat;
> hapus untuk memulai bersih.

### 2.2 Test ISO di QEMU

Boot UEFI (sesuai target VM):

```sh
qemu-system-x86_64 \
  -machine q35,accel=kvm -cpu host -m 4096 -smp 2 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4M.fd \
  -drive if=pflash,format=raw,file=$PWD/OVMF_VARS.4M.fd \
  -cdrom build/iso/out/yadika-os-*.iso \
  -netdev user,id=n0 -device virtio-net-pci,netdev=n0
```

Boot BIOS sederhana juga didukung releng:

```sh
qemu-system-x86_64 -m 4096 -cdrom build/iso/out/yadika-os-*.iso
```

Checklist verifikasi ISO:

| Yang dicek | Hasil diharapkan |
| --- | --- |
| Boot menu GRUB | entri archlinux x86_64 |
| Setelah boot selesai | langsung layar penuh Chromium menampilkan yadika-os (tanpa login) |
| Start → Terminal | shell asli via `/pty` (bukti node-pty jalan di squashfs) |
| Start → Files | file manager membuka data dir; buat file/folder |
| `curl localhost:3000/api/fs/list?path=/` (dari tty) | JSON entries |
| Reboot ulang ISO | kembali konsisten (live, tanpa persistensi) |

### 2.3 Rescue / debug ISO

Saat GRUB menampilkan menu, tekan `e` dan tambahkan di baris kernel:

```
systemd.mask=kiosk.service
```

lalu boot (`Ctrl+X`) — tty1 akan autologin sebagai user `kiosk`
(drop-in getty) sehingga bisa menjalankan `journalctl -u yadika`,
`journalctl -u kiosk`, dan memeriksa `/opt/web-os`.
