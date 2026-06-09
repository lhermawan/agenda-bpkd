# BPKD Ciamis E-Agenda

Aplikasi agenda berbasis PHP, MySQL, dan JavaScript untuk menampilkan daftar agenda serta notifikasi suara.

## Instalasi Database MySQL

1. Buat database dan tabel menggunakan `setup.sql`:

   ```bash
   mysql -u root -p < setup.sql
   ```

2. Sesuaikan koneksi database melalui environment server jika berbeda dari nilai bawaan:

   - `MYSQL_HOST` bawaan `127.0.0.1`
   - `MYSQL_PORT` bawaan `3306`
   - `MYSQL_DATABASE` bawaan `agenda_bpkd`
   - `MYSQL_USER` bawaan `root`
   - `MYSQL_PASSWORD` bawaan kosong

3. Akses aplikasi melalui `index.php`.

## Login Admin Awal

`setup.sql` membuat akun admin awal berikut:

- Username: `admin`
- Password: `admin123`

Segera ganti password admin untuk penggunaan produksi dengan mengganti `password_hash` pada tabel `admins` menggunakan hash dari `password_hash()` PHP.

## Hak Akses

- Pengunjung dapat melihat daftar agenda dan menjalankan tes suara.
- Admin harus login untuk menambah dan menghapus agenda.
- Status notifikasi alarm disimpan ke MySQL sehingga tidak lagi bergantung pada `localStorage` browser.
