
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    type ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL,
    expense_type ENUM('NORMAL', 'REIMBURSE'),
    category VARCHAR(255),
    activity_name VARCHAR(255),
    description TEXT,
    grand_total DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_items (
    id VARCHAR(50) PRIMARY KEY,
    transaction_id VARCHAR(50),
    name VARCHAR(255),
    qty INT,
    price DECIMAL(15, 2),
    total DECIMAL(15, 2),
    file_url TEXT,
    drive_file_id VARCHAR(255),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reimbursements (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    requestor_name VARCHAR(255),
    category VARCHAR(255),
    activity_name VARCHAR(255),
    description TEXT,
    grand_total DECIMAL(15, 2) DEFAULT 0,
    status ENUM('PENDING', 'PROSES', 'BERHASIL', 'DITOLAK') DEFAULT 'PENDING',
    transfer_proof_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reimbursement_items (
    id VARCHAR(50) PRIMARY KEY,
    reimbursement_id VARCHAR(50),
    name VARCHAR(255),
    qty INT,
    price DECIMAL(15, 2),
    total DECIMAL(15, 2),
    file_url TEXT,
    drive_file_id VARCHAR(255),
    FOREIGN KEY (reimbursement_id) REFERENCES reimbursements(id) ON DELETE CASCADE
);

-- Seed Categories
INSERT IGNORE INTO categories (name) VALUES 
('Operasional'), ('Transportasi'), ('Makan & Minum'), ('ATK'), ('Marketing'), ('Gaji'), ('Maintenance'), ('Project Alpha');
