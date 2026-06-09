<?php

declare(strict_types=1);

require_once __DIR__ . '/database.php';

start_secure_session();
header('Content-Type: application/json; charset=utf-8');

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_admin(): void
{
    if (!is_admin_logged_in()) {
        json_response(['success' => false, 'message' => 'Sesi admin diperlukan. Silakan login terlebih dahulu.'], 401);
    }
}

function request_data(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);
    if (is_array($json)) {
        return $json;
    }

    return $_POST;
}

function valid_datetime(string $value): bool
{
    $date = DateTime::createFromFormat('Y-m-d\TH:i', $value);
    return $date instanceof DateTime && $date->format('Y-m-d\TH:i') === $value;
}

try {
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    if ($action === 'session' && $method === 'GET') {
        json_response([
            'success' => true,
            'loggedIn' => is_admin_logged_in(),
            'adminName' => current_admin_name(),
        ]);
    }

    if ($action === 'login' && $method === 'POST') {
        $data = request_data();
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($username === '' || $password === '') {
            json_response(['success' => false, 'message' => 'Username dan password wajib diisi.'], 422);
        }

        $stmt = db()->prepare('SELECT id, username, password_hash, nama FROM admins WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            json_response(['success' => false, 'message' => 'Username atau password salah.'], 401);
        }

        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int) $admin['id'];
        $_SESSION['admin_name'] = $admin['nama'];

        json_response(['success' => true, 'message' => 'Login berhasil.', 'adminName' => $admin['nama']]);
    }

    if ($action === 'logout' && $method === 'POST') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
        json_response(['success' => true, 'message' => 'Logout berhasil.']);
    }

    if ($action === 'agendas' && $method === 'GET') {
        json_response(['success' => true, 'agendas' => fetch_agendas()]);
    }

    if ($action === 'agendas' && $method === 'POST') {
        require_admin();
        $data = request_data();
        $nama = trim((string) ($data['nama'] ?? ''));
        $lokasi = trim((string) ($data['lokasi'] ?? ''));
        $peserta = trim((string) ($data['peserta'] ?? ''));
        $waktu = trim((string) ($data['waktu'] ?? ''));

        if ($nama === '' || $lokasi === '' || $peserta === '' || !valid_datetime($waktu)) {
            json_response(['success' => false, 'message' => 'Data agenda belum lengkap atau format waktu tidak valid.'], 422);
        }

        $stmt = db()->prepare(
            'INSERT INTO agendas (nama, lokasi, peserta, waktu, created_by)
             VALUES (:nama, :lokasi, :peserta, :waktu, :created_by)'
        );
        $stmt->execute([
            ':nama' => $nama,
            ':lokasi' => $lokasi,
            ':peserta' => $peserta,
            ':waktu' => str_replace('T', ' ', $waktu) . ':00',
            ':created_by' => $_SESSION['admin_id'],
        ]);

        json_response(['success' => true, 'message' => 'Agenda berhasil disimpan.', 'agendas' => fetch_agendas()], 201);
    }

    if ($action === 'agendas' && $method === 'DELETE') {
        require_admin();
        $id = (int) ($_GET['id'] ?? 0);
        if ($id < 1) {
            json_response(['success' => false, 'message' => 'ID agenda tidak valid.'], 422);
        }

        $stmt = db()->prepare('DELETE FROM agendas WHERE id = ?');
        $stmt->execute([$id]);
        json_response(['success' => true, 'message' => 'Agenda berhasil dihapus.', 'agendas' => fetch_agendas()]);
    }

    if ($action === 'notify' && $method === 'POST') {
        $data = request_data();
        $id = (int) ($data['id'] ?? 0);
        $type = (string) ($data['type'] ?? '');
        $columns = ['30' => 'notified30', '10' => 'notified10', '0' => 'notified0'];

        if ($id < 1 || !isset($columns[$type])) {
            json_response(['success' => false, 'message' => 'Data notifikasi tidak valid.'], 422);
        }

        $stmt = db()->prepare(sprintf('UPDATE agendas SET %s = 1 WHERE id = ?', $columns[$type]));
        $stmt->execute([$id]);
        json_response(['success' => true, 'agendas' => fetch_agendas()]);
    }

    json_response(['success' => false, 'message' => 'Endpoint tidak ditemukan.'], 404);
} catch (PDOException $exception) {
    json_response([
        'success' => false,
        'message' => 'Koneksi database gagal. Pastikan MySQL dan setup.sql sudah dikonfigurasi.',
        'detail' => $exception->getMessage(),
    ], 500);
} catch (Throwable $exception) {
    json_response(['success' => false, 'message' => $exception->getMessage()], 500);
}
