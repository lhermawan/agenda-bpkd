<?php
require_once __DIR__ . '/database.php';

start_secure_session();

if (is_admin_logged_in()) {
    header('Location: index.php');
    exit;
}

$error = '';
$username = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $error = 'Username dan password wajib diisi.';
    } else {
        try {
            $stmt = db()->prepare('SELECT id, username, password_hash, nama FROM admins WHERE username = ? LIMIT 1');
            $stmt->execute([$username]);
            $admin = $stmt->fetch();

            if ($admin && password_verify($password, $admin['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['admin_id'] = (int) $admin['id'];
                $_SESSION['admin_name'] = $admin['nama'];

                header('Location: index.php');
                exit;
            }

            $error = 'Username atau password salah.';
        } catch (PDOException $exception) {
            $error = 'Koneksi database gagal. Pastikan MySQL dan setup.sql sudah dikonfigurasi.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Admin - BPKD Ciamis E-Agenda</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="login-page">
    <main class="login-shell">
        <section class="login-panel shadow-lg">
            <div class="login-brand text-center mb-4">
                <img src="assets/img/logo.png" alt="Logo BPKD Ciamis" class="login-logo mb-3">
                <h1 class="login-title">Login Admin</h1>
                <p class="text-muted mb-0">BPKD Ciamis E-Agenda Information System</p>
            </div>

            <?php if ($error !== ''): ?>
                <div class="alert alert-danger" role="alert">
                    <i class="fa-solid fa-circle-exclamation me-2"></i><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
                </div>
            <?php endif; ?>

            <form method="post" action="login.php" class="login-form">
                <div class="mb-3">
                    <label for="username" class="form-label fw-bold small">Username</label>
                    <div class="input-group input-group-lg">
                        <span class="input-group-text"><i class="fa-solid fa-user-shield"></i></span>
                        <input type="text" class="form-control" id="username" name="username" autocomplete="username" required autofocus placeholder="Masukkan username admin" value="<?= htmlspecialchars($username, ENT_QUOTES, 'UTF-8') ?>">
                    </div>
                </div>

                <div class="mb-4">
                    <label for="password" class="form-label fw-bold small">Password</label>
                    <div class="input-group input-group-lg">
                        <span class="input-group-text"><i class="fa-solid fa-key"></i></span>
                        <input type="password" class="form-control" id="password" name="password" autocomplete="current-password" required placeholder="Masukkan password admin">
                    </div>
                </div>

                <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm">
                    <i class="fa-solid fa-right-to-bracket me-2"></i>Masuk Dashboard Admin
                </button>
            </form>

            <div class="text-center mt-4">
                <a href="index.php" class="text-decoration-none fw-semibold">
                    <i class="fa-solid fa-arrow-left me-1"></i>Kembali ke daftar agenda
                </a>
            </div>
        </section>
    </main>
</body>
</html>
