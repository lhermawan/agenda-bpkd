<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        db_host(),
        db_port(),
        db_name()
    );

    $pdo = new PDO($dsn, db_user(), db_pass(), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function fetch_agendas(): array
{
    $stmt = db()->query(
        'SELECT id, nama, lokasi, peserta, DATE_FORMAT(waktu, "%Y-%m-%dT%H:%i") AS waktu,
                notified30, notified10, notified0
         FROM agendas
         ORDER BY waktu ASC'
    );

    return array_map(static function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'nama' => $row['nama'],
            'lokasi' => $row['lokasi'],
            'peserta' => $row['peserta'],
            'waktu' => $row['waktu'],
            'notified30' => (bool) $row['notified30'],
            'notified10' => (bool) $row['notified10'],
            'notified0' => (bool) $row['notified0'],
        ];
    }, $stmt->fetchAll());
}
