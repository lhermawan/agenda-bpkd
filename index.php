<?php
require_once __DIR__ . '/config.php';
start_secure_session();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BPKD Ciamis E-Agenda Information System</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <nav class="navbar navbar-custom sticky-top d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
            <img src="assets/img/logo.png" alt="Logo BPKD Ciamis">
            <div>
                <h1 class="app-title">BPKD Ciamis E-Agenda</h1>
                <div class="app-subtitle">Information System Based By Notification</div>
            </div>
        </div>
        <div class="d-flex gap-2 flex-wrap justify-content-end">
            <span class="badge bg-success-subtle text-success-emphasis align-self-center d-none" id="adminBadge">
                <i class="fa-solid fa-user-shield me-1"></i><span id="adminName"></span>
            </span>
            <button class="btn btn-outline-secondary shadow-sm d-none" id="logoutBtn" onclick="logoutAdmin()">
                <i class="fa-solid fa-right-from-bracket me-1"></i> Logout
            </button>
            <button class="btn btn-audio-init shadow-sm" id="initAudioBtn" onclick="initAudio()">
                <i class="fa-solid fa-volume-high me-1"></i> Izinkan Suara (Wajib)
            </button>
            <button class="btn btn-danger shadow-sm" onclick="stopAudio()" title="Hentikan notifikasi suara">
                <i class="fa-solid fa-stop"></i> Stop
            </button>
        </div>
    </nav>

    <div class="container-fluid py-4 px-4">

        <div class="alert alert-warning alert-dismissible fade show shadow-sm" role="alert" id="holidayBanner">
            <i class="fa-solid fa-bell text-warning me-2 fs-5"></i>
            <strong id="holidayBannerTitle">Hari Penting:</strong> <span id="holidayBannerText"></span>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>

        <div class="alert shadow-sm d-none" role="alert" id="appMessage"></div>

        <div class="row">
            <div class="col-lg-4">

                <div class="card card-custom" id="loginCard">
                    <div class="card-header-custom d-flex align-items-center">
                        <i class="fa-solid fa-user-lock text-primary me-2"></i> Login Admin
                    </div>
                    <div class="card-body">
                        <p class="small text-muted mb-3">Admin harus login terlebih dahulu untuk menambah atau menghapus agenda.</p>
                        <form id="loginForm">
                            <div class="mb-3">
                                <label class="form-label fw-bold small">Username</label>
                                <input type="text" class="form-control bg-light" id="username" autocomplete="username" required placeholder="Masukkan username admin">
                            </div>
                            <div class="mb-4">
                                <label class="form-label fw-bold small">Password</label>
                                <input type="password" class="form-control bg-light" id="password" autocomplete="current-password" required placeholder="Masukkan password admin">
                            </div>
                            <button type="submit" class="btn btn-primary w-100 fw-bold shadow-sm">
                                <i class="fa-solid fa-right-to-bracket me-1"></i> Login Admin
                            </button>
                        </form>
                    </div>
                </div>

                <div class="card card-custom d-none" id="agendaCard">
                    <div class="card-header-custom d-flex align-items-center">
                        <i class="fa-solid fa-calendar-plus text-primary me-2"></i> Tambah Agenda Baru
                    </div>
                    <div class="card-body">
                        <form id="agendaForm">
                            <div class="mb-3">
                                <label class="form-label fw-bold small">Judul Agenda</label>
                                <input type="text" class="form-control bg-light" id="nama" required placeholder="Cth: Rapat Paripurna DPRD">
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold small">Lokasi / Media</label>
                                <input type="text" class="form-control bg-light" id="lokasi" required placeholder="Cth: Aula BPKD / Zoom">
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold small">Peserta / Keterangan</label>
                                <textarea class="form-control bg-light" id="peserta" rows="2" required placeholder="Cth: Kepala Badan, Sekretaris, dan Kabid"></textarea>
                            </div>
                            <div class="mb-4">
                                <label class="form-label fw-bold small">Waktu Pelaksanaan</label>
                                <input type="datetime-local" class="form-control bg-light" id="waktu" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 fw-bold shadow-sm">
                                <i class="fa-solid fa-save me-1"></i> Simpan Agenda
                            </button>
                        </form>
                    </div>
                </div>

                <div class="card card-custom">
                    <div class="card-header-custom d-flex align-items-center">
                        <i class="fa-solid fa-calendar-day text-danger me-2"></i> Kalender Libur & Hari Penting
                    </div>
                    <div class="card-body p-0">
                        <div class="holiday-list" id="holidayListContainer"></div>
                    </div>
                </div>

            </div>

            <div class="col-lg-8">
                <div class="card card-custom h-100">
                    <div class="card-header-custom d-flex justify-content-between align-items-center">
                        <div><i class="fa-solid fa-table-list text-primary me-2"></i> Daftar Agenda Utama</div>
                        <ul class="nav nav-pills" id="agendaTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active btn-sm fw-bold" id="today-tab" data-bs-toggle="tab" data-bs-target="#today-view" type="button" onclick="switchTab('today')">Hari Ini Saja</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link btn-sm fw-bold" id="all-tab" data-bs-toggle="tab" data-bs-target="#all-view" type="button" onclick="switchTab('all')">Semua Database</button>
                            </li>
                        </ul>
                    </div>
                    <div class="card-body p-0 table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Jadwal</th>
                                    <th>Detail Agenda</th>
                                    <th>Status Alarm</th>
                                    <th class="pe-4 text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="agendaTableBody"></tbody>
                        </table>

                        <div id="emptyState" class="text-center p-5" style="display: none;">
                            <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" width="100" class="mb-3 opacity-50">
                            <h5 class="text-muted fw-bold">Belum ada agenda</h5>
                            <p class="text-muted small">Admin dapat menambahkan agenda setelah login.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        window.APP_SESSION = {
            loggedIn: <?= json_encode(is_admin_logged_in()) ?>,
            adminName: <?= json_encode(current_admin_name(), JSON_UNESCAPED_UNICODE) ?>
        };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>
