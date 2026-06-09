<?php
require_once __DIR__ . '/config.php';
start_secure_session();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BPKD Ciamis E-Agenda Information System Based By Notification</title>
    <link rel="icon" type="image/png" href="assets/img/logo.png">
    <link rel="shortcut icon" href="assets/img/logo.png">
    <link rel="apple-touch-icon" href="assets/img/logo.png">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <nav class="navbar navbar-custom sticky-top shadow-sm px-4 py-2">
        <div class="navbar-brand d-flex align-items-center">
            <img src="assets/img/logo.png" height="45" class="me-3" alt="Logo BPKD Ciamis" onerror="this.src='https://via.placeholder.com/45?text=BPKD';">
            <div>
                <h5 class="mb-0 fw-bold text-dark app-title">BPKD Ciamis E-Agenda</h5>
                <small class="text-muted d-block app-subtitle">Information System Based By Notification</small>
            </div>
        </div>
        <div class="d-flex gap-2 flex-wrap justify-content-end">
            <a class="btn btn-outline-primary btn-sm fw-bold px-3" id="loginPageBtn" href="login.php">
                <i class="fa-solid fa-user-lock me-1"></i> Login Admin
            </a>
            <span class="badge bg-success-subtle text-success-emphasis align-self-center d-none" id="adminBadge">
                <i class="fa-solid fa-user-shield me-1"></i><span id="adminName"></span>
            </span>
            <button class="btn btn-outline-secondary btn-sm fw-bold px-3 d-none" id="logoutBtn" onclick="logoutAdmin()">
                <i class="fa-solid fa-right-from-bracket me-1"></i> Logout
            </button>
            <button class="btn btn-success btn-sm fw-bold px-3" id="initAudioBtn" onclick="initAudio()">
                <i class="fa-solid fa-volume-high me-1"></i> Aktifkan Suara
            </button>
            <button class="btn btn-danger btn-sm fw-bold px-3" onclick="stopAudio()">
                <i class="fa-solid fa-stop me-1"></i> Stop Suara
            </button>
        </div>
    </nav>

    <div class="container-fluid py-4 px-4">
        <div class="alert shadow-sm d-none" role="alert" id="appMessage"></div>

        <div class="row g-4">
            <div class="col-lg-4">
                <div class="card card-custom p-3 mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="fw-bold mb-0"><i class="fa-solid fa-calendar-days text-primary me-1"></i> Kalender Pemda</h6>
                        <div class="d-flex gap-1 align-items-center">
                            <button class="btn btn-sm btn-light border py-0 px-2" onclick="changeMonth(-1)" type="button"><i class="fa-solid fa-chevron-left"></i></button>
                            <span id="monthLabel" class="fw-bold small text-center" style="min-width: 100px;">Bulan Tahun</span>
                            <button class="btn btn-sm btn-light border py-0 px-2" onclick="changeMonth(1)" type="button"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                    </div>
                    <div id="calendarGrid" class="cal-grid"></div>
                    <div id="dateInfo" class="mt-3 text-muted">
                        <i class="fa-solid fa-circle-info me-1"></i> Klik pada kotak tanggal untuk melihat keterangan hari penting atau memfilter agenda.
                    </div>
                </div>

                <div class="card card-custom p-3" id="agendaCard">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="fw-bold mb-0"><i class="fa-solid fa-pen-to-square text-primary me-1"></i> Input / Edit Agenda</h6>
                        <span class="badge bg-warning-subtle text-warning-emphasis d-none" id="editBadge">Mode Edit</span>
                    </div>

                    <div class="alert alert-info small py-2" id="loginNotice">
                        <i class="fa-solid fa-circle-info me-1"></i> Login admin diperlukan untuk menyimpan, mengedit, atau menghapus agenda.
                        <a href="login.php" class="fw-bold ms-1">Login di sini</a>.
                    </div>

                    <form id="agendaForm">
                        <input type="hidden" id="editId">
                        <div class="mb-2">
                            <label class="small fw-bold mb-1" for="nama">Judul Agenda</label>
                            <input type="text" id="nama" class="form-control form-control-sm" placeholder="Masukkan judul agenda" required>
                        </div>
                        <div class="mb-2">
                            <label class="small fw-bold mb-1" for="lokasi">Lokasi Agenda</label>
                            <input type="text" id="lokasi" class="form-control form-control-sm" placeholder="Ruangan / Media Zoom" required>
                        </div>
                        <div class="mb-2">
                            <label class="small fw-bold mb-1" for="peserta">Yang Menghadiri</label>
                            <textarea id="peserta" class="form-control form-control-sm" rows="2" placeholder="Daftar pejabat / staf yang hadir" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="small fw-bold mb-1" for="waktu">Waktu Pelaksanaan</label>
                            <input type="datetime-local" id="waktu" class="form-control form-control-sm" required>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-primary btn-sm w-100 fw-bold shadow-sm" id="saveAgendaBtn">
                                <i class="fa-solid fa-floppy-disk me-1"></i> Simpan Agenda
                            </button>
                            <button type="button" class="btn btn-light border btn-sm fw-bold d-none" id="cancelEditBtn" onclick="resetAgendaForm()">
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="col-lg-8">
                <div class="card card-custom p-3 h-100">
                    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <h6 class="fw-bold mb-0"><i class="fa-solid fa-table-list text-primary me-1"></i> Monitoring Dashboard</h6>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-toggle active" id="btnToday" onclick="filterAgenda('today')" type="button">Tampil Hari Ini Saja</button>
                            <button class="btn btn-sm btn-toggle" id="btnAll" onclick="filterAgenda('all')" type="button">Tampil Semua Database</button>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 agenda-table">
                            <thead class="table-light">
                                <tr>
                                    <th width="22%">Jadwal Pelaksanaan</th>
                                    <th width="43%">Detail Komponen Agenda</th>
                                    <th width="20%">Status Real-time</th>
                                    <th width="15%" class="text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="agendaTableBody"></tbody>
                        </table>
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
