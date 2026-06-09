CREATE DATABASE IF NOT EXISTS agenda_bpkd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agenda_bpkd;

CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agendas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    lokasi VARCHAR(255) NOT NULL,
    peserta TEXT NOT NULL,
    waktu DATETIME NOT NULL,
    notified30 TINYINT(1) NOT NULL DEFAULT 0,
    notified10 TINYINT(1) NOT NULL DEFAULT 0,
    notified0 TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_agendas_waktu (waktu),
    CONSTRAINT fk_agendas_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Akun awal: username admin, password admin123.
-- Segera ganti password setelah instalasi produksi.
INSERT INTO admins (username, password_hash, nama)
VALUES ('admin', '$2y$12$hvN9ftnBRyVJDOQM/TXF1.dC/tgpYwvvje9OJb5cMeeqFOyNvjr4K', 'Administrator')
ON DUPLICATE KEY UPDATE username = username;
