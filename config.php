<?php
// Konfigurasi aplikasi BPKD Ciamis E-Agenda.
// Ubah nilai environment berikut di server produksi jika diperlukan:
// MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD.

declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';
const DB_NAME = 'agenda_bpkd';
const DB_USER = 'root';
const DB_PASS = '';

function config_value(string $key, string $default): string
{
    $value = getenv($key);
    return $value === false || $value === '' ? $default : $value;
}

function db_host(): string
{
    return config_value('MYSQL_HOST', DB_HOST);
}

function db_port(): string
{
    return config_value('MYSQL_PORT', DB_PORT);
}

function db_name(): string
{
    return config_value('MYSQL_DATABASE', DB_NAME);
}

function db_user(): string
{
    return config_value('MYSQL_USER', DB_USER);
}

function db_pass(): string
{
    return config_value('MYSQL_PASSWORD', DB_PASS);
}

function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

function is_admin_logged_in(): bool
{
    return !empty($_SESSION['admin_id']);
}

function current_admin_name(): ?string
{
    return $_SESSION['admin_name'] ?? null;
}
