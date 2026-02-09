
// Coba load dotenv
try {
    require('dotenv').config();
} catch (e) {
    console.log('[INFO] Modul dotenv tidak ditemukan. Mengandalkan Environment Variables sistem.');
}

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// const jwt = require('jsonwebtoken'); // JWT Disabled

const app = express();
const PORT = process.env.PORT || 3000;
// const JWT_SECRET = process.env.JWT_SECRET || 'rdr-secret-key-change-in-prod-999'; // JWT Disabled

// --- IN-MEMORY TOKEN CACHE ---
// Format: tokenString -> { userObject, expiresAt }
// Namun untuk kesederhanaan, kita gunakan Map biasa. Anda bisa menambahkan logika kedaluwarsa jika perlu.
const tokenCache = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// DEBUG LOGGER
app.use((req, res, next) => {
    console.log(`[DEBUG REQUEST] ${req.method} ${req.url}`);
    next();
});

// --- DATABASE CONNECTION CONFIGURATION ---
// PENTING: Gunakan 127.0.0.1, bukan localhost untuk menghindari isu IPv6 di Node.js
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rdr_admin',
    port: process.env.DB_PORT || 3306,
    dateStrings: true,
    multipleStatements: true // Penting untuk menjalankan schema.sql
};

let pool;

// Helper: Hash Password (SHA256)
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const ensureCategoriesTableSchema = async () => {
    if (!pool) return;
    try {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL DEFAULT 'PENGELUARAN',
                UNIQUE KEY unique_name_type (name, type)
            );
        `);

        // Check if 'type' column exists, if not add it
        const [columns] = await pool.query("SHOW COLUMNS FROM categories LIKE 'type'");
        if (columns.length === 0) {
            console.log('[MIGRATION] Adding type column to categories table...');
            await pool.query("ALTER TABLE categories ADD COLUMN type ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL DEFAULT 'PENGELUARAN'");
            
            // Drop old unique index on name if exists and add composite unique index
            try {
                await pool.query("DROP INDEX name ON categories");
            } catch (e) { /* Ignore if index doesn't exist */ }
            
            try {
                 await pool.query("ALTER TABLE categories ADD UNIQUE KEY unique_name_type (name, type)");
            } catch (e) { /* Ignore if already exists */ }
        }

        console.log('[SUCCESS] Tabel categories terverifikasi.');
    } catch (error) {
        console.error('[WARN] Gagal verifikasi tabel categories:', error.message);
    }
};

// --- INITIALIZE DATABASE AUTOMATICALLY ---
const initDatabase = async () => {
    try {
        console.log(`[INIT] Mencoba menghubungkan ke MySQL di ${dbConfig.host}...`);

        // 1. Koneksi awal TANPA database untuk mengecek/membuat DB
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port
        });

        // 2. Buat Database jika belum ada
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        console.log(`[SUCCESS] Database '${dbConfig.database}' siap/tersedia.`);
        await connection.end();

        // 3. Buat Pool Koneksi ke Database yang sudah pasti ada
        pool = mysql.createPool(dbConfig);

        // 4. Jalankan Schema (Buat Tabel Otomatis)
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            const conn = await pool.getConnection();
            
            // Split query berdasarkan ';' untuk eksekusi satu per satu (lebih aman)
            const queries = schemaSql.split(';').filter(q => q.trim().length > 0);
            
            for (const query of queries) {
                if (!query.trim()) continue;
                try {
                    await conn.query(query);
                } catch (err) {
                    // Abaikan error jika tabel sudah ada
                    if (!err.message.includes("already exists") && !err.message.includes("Duplicate entry")) {
                        console.warn("[WARN] Gagal eksekusi query schema:", err.message);
                    }
                }
            }
            conn.release();
            console.log('[SUCCESS] Tabel database berhasil disinkronisasi.');
        } else {
            console.warn('[WARN] File schema.sql tidak ditemukan.');
        }

        // 5. Pastikan User Admin Ada (Fallback jika schema.sql gagal seed)
        await ensureAdminUser();
        await ensureUsersTableSchema();
        
        // 6. Explicitly Ensure Employees Table Exists (Safety Check)
        await ensureEmployeesTable();

        // 7. Ensure Notifications Table Exists
        await ensureNotificationsTable();
        
        // 8. Ensure Categories Table Schema (Migration)
        await ensureCategoriesTableSchema();

    } catch (err) {
        console.error('\n===================================================');
        console.error('[FATAL] KONEKSI DATABASE GAGAL');
        console.error('Error:', err.message);
        console.error('---------------------------------------------------');
        console.error('Solusi:');
        console.error('1. Pastikan Sudah Aktif.');
        console.error('2. Pastikan password di file .env benar (kosongkan jika default XAMPP).');
        console.error('3. Pastikan port MySQL adalah 3306.');
        console.error('===================================================\n');
    }
};

const ensureAdminUser = async () => {
    if (!pool) return;
    try {
        const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', ['admin']);
        if (rows.length === 0) {
            console.log('[INFO] User admin tidak ditemukan. Membuat user admin default...');
            const hashedPassword = hashPassword('admin');
            await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'admin']);
            console.log('[SUCCESS] User admin berhasil dibuat (Pass: admin).');
        }
    } catch (error) {
        console.error('[WARN] Gagal mengecek/membuat user admin:', error.message);
    }
};

const ensureEmployeesTable = async () => {
    if (!pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                position VARCHAR(100),
                phone VARCHAR(20),
                email VARCHAR(100),
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Add photo_url column if not exists
        try {
            await pool.query("ALTER TABLE employees ADD COLUMN photo_url TEXT");
        } catch (e) {
            // Ignore if column already exists
        }

        console.log('[SUCCESS] Tabel employees terverifikasi.');
    } catch (error) {
        console.error('[WARN] Gagal verifikasi tabel employees:', error.message);
    }
}

const ensureNotificationsTable = async () => {
    if (!pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL COMMENT 'NULL means broadcast to all employees',
                message TEXT NOT NULL,
                type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Add target_role column if not exists
        try {
            await pool.query("ALTER TABLE notifications ADD COLUMN target_role ENUM('employee', 'admin') DEFAULT 'employee'");
        } catch (e) {
            // Ignore error if column already exists
        }

        console.log('[SUCCESS] Tabel notifications terverifikasi.');
    } catch (error) {
        console.error('[WARN] Gagal verifikasi tabel notifications:', error.message);
    }
};

const ensureUsersTableSchema = async () => {
    if (!pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
                full_name VARCHAR(100),
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Add photo_url column if not exists (for existing tables)
        try {
            await pool.query("ALTER TABLE users ADD COLUMN photo_url TEXT");
        } catch (e) {
            // Ignore if column already exists
        }

        console.log('[SUCCESS] Tabel users terverifikasi.');
    } catch (error) {
        console.error('[WARN] Gagal verifikasi tabel users:', error.message);
    }
};

// Jalankan inisialisasi
initDatabase();

// Middleware: Authenticate Token (USING CACHE)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Format: "Bearer <TOKEN>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    // Cek di Cache
    if (tokenCache.has(token)) {
        req.user = tokenCache.get(token);
        next();
    } else {
        return res.status(403).json({ message: 'Token tidak valid atau sesi telah berakhir.' });
    }
};

// --- FILE UPLOAD STORAGE CONFIGURATION ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'file-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

// --- API ROUTES ---

// Upload Route
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ status: 'success', url: fileUrl });
});

// Public Route
app.get('/api/test-db', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ status: 'error', message: 'Pool database belum terinisialisasi' });
    
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        res.json({ status: 'success', message: 'Terhubung ke MySQL Database!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Gagal terhubung ke Database.', error: error.message });
    }
});

// Login Route (Supports Users & Employees)
app.post('/api/login', async (req, res) => {
    if (!pool) return res.status(500).json({ success: false, message: 'DB not connected' });
    const { username, password } = req.body;

    console.log(`[LOGIN ATTEMPT] User: ${username}`);
    
    try {
        const hashedPassword = hashPassword(password);
        
        // 1. Cek Tabel Users (Admin)
        const [users] = await pool.query('SELECT id, username, role, full_name FROM users WHERE username = ? AND password = ?', [username, hashedPassword]);
        
        if (users.length > 0) {
            const user = users[0];
            // GENERATE RANDOM TOKEN
            const token = crypto.randomBytes(32).toString('hex');
            const userPayload = { id: user.id, username: user.username, role: user.role, full_name: user.full_name };
            
            // SIMPAN KE CACHE
            tokenCache.set(token, userPayload);
            
            console.log(`[LOGIN SUCCESS] Admin: ${username} (Token Cached)`);
            return res.json({ success: true, user: user, token: token });
        } 

        // 2. Cek Tabel Employees (Pegawai)
        const [employees] = await pool.query('SELECT id, username, name, position, email, phone FROM employees WHERE username = ? AND password = ?', [username, hashedPassword]);
        
        if (employees.length > 0) {
            const emp = employees[0];
            // GENERATE RANDOM TOKEN
            const token = crypto.randomBytes(32).toString('hex');
            const userPayload = { id: emp.id, username: emp.username, role: 'employee', name: emp.name };
            
            // SIMPAN KE CACHE
            tokenCache.set(token, userPayload);
            
            console.log(`[LOGIN SUCCESS] Employee: ${username} (Token Cached)`);
            
            const userObj = {
                id: emp.id,
                username: emp.username,
                role: 'employee',
                details: emp 
            };
            
            return res.json({ success: true, user: userObj, token: token });
        }

        console.log(`[LOGIN FAILED] Invalid credentials for: ${username}`);
        res.status(401).json({ success: false, message: 'Username atau password salah' });

    } catch (error) {
        console.error(`[LOGIN ERROR]`, error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Logout Route (Remove Token from Cache)
app.post('/api/logout', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token && tokenCache.has(token)) {
        tokenCache.delete(token);
        console.log('[LOGOUT] Token removed from cache.');
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
});

// --- PROFILE API ---
app.put('/api/profile', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    
    const { fullName, password } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    // Validate inputs
    if (!fullName || fullName.trim() === '') {
        return res.status(400).json({ message: 'Nama lengkap tidak boleh kosong' });
    }

    try {
        let query = '';
        let params = [];
        let hashedPassword = null;

        if (password && password.trim() !== '') {
            hashedPassword = hashPassword(password);
        }

        if (role === 'employee') {
            if (hashedPassword) {
                query = 'UPDATE employees SET name = ?, password = ? WHERE id = ?';
                params = [fullName, hashedPassword, userId];
            } else {
                query = 'UPDATE employees SET name = ? WHERE id = ?';
                params = [fullName, userId];
            }
        } else {
            // Admin (users table)
            if (hashedPassword) {
                query = 'UPDATE users SET full_name = ?, password = ? WHERE id = ?';
                params = [fullName, hashedPassword, userId];
            } else {
                query = 'UPDATE users SET full_name = ? WHERE id = ?';
                params = [fullName, userId];
            }
        }

        await pool.query(query, params);
        
        // Return updated user info
        const updatedUser = { ...req.user };
        const { photoUrl } = req.body;

        if (role === 'employee') {
            updatedUser.name = fullName;
            if (photoUrl !== undefined) updatedUser.photo_url = photoUrl;
        } else {
            updatedUser.full_name = fullName;
            if (photoUrl !== undefined) updatedUser.photo_url = photoUrl;
        }

        res.json({ success: true, message: 'Profil berhasil diperbarui', user: updatedUser });

    } catch (error) {
        console.error('[API ERROR] Update profile failed:', error);
        res.status(500).json({ message: 'Gagal memperbarui profil' });
    }
});

// --- SETTINGS API (NEW) ---
app.get('/api/settings', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    try {
        const [rows] = await pool.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.setting_key] = JSON.parse(row.setting_value);
            } catch (e) {
                settings[row.setting_key] = row.setting_value;
            }
        });
        res.json(settings);
    } catch (error) {
        console.error('[API ERROR] Fetch settings failed:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});

app.post('/api/settings', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { key, value } = req.body;
    try {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
        await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [key, stringValue, stringValue]
        );
        res.json({ success: true, message: 'Settings saved' });
    } catch (error) {
        console.error('[API ERROR] Save setting failed:', error);
        res.status(500).json({ success: false, message: 'Failed to save setting' });
    }
});

// --- CATEGORIES API ---
app.get('/api/categories', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { type } = req.query;
    try {
        let query = 'SELECT name, type FROM categories ORDER BY name ASC';
        let params = [];
        if (type) {
            query = 'SELECT name, type FROM categories WHERE type = ? ORDER BY name ASC';
            params = [type];
        }
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('[API ERROR] Fetch categories failed:', error);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { name, type } = req.body;
    
    if (!name) return res.status(400).json({ message: 'Name required' });
    
    const categoryType = type || 'PENGELUARAN';

    try {
        await pool.query('INSERT INTO categories (name, type) VALUES (?, ?)', [name, categoryType]);
        res.json({ success: true, message: 'Category added' });
    } catch (error) {
        console.error('[API ERROR] Add category failed:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Kategori sudah ada untuk tipe ini' });
        }
        res.status(500).json({ success: false, message: 'Failed to add category' });
    }
});

app.delete('/api/categories/:name', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { name } = req.params;
    const { type } = req.query;

    try {
        let query = 'DELETE FROM categories WHERE name = ?';
        let params = [name];
        
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        await pool.query(query, params);
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('[API ERROR] Delete category failed:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
});

// --- USERS API (Admin Only) ---
app.get('/api/users', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    try {
        const [rows] = await pool.query('SELECT id, username, role, full_name FROM users');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { username, password } = req.body;
    try {
        const hashedPassword = hashPassword(password);
        await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, 'admin']);
        res.json({ success: true, message: 'User created' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create user. Username might exist.' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

// --- EMPLOYEES API ---
app.get('/api/employees', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    try {
        const [rows] = await pool.query('SELECT id, name, position, phone, email, username FROM employees ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('[API ERROR] Fetch employees failed:', error);
        res.status(500).json({ message: 'Failed to fetch employees: ' + error.message });
    }
});

app.post('/api/employees', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { name, position, phone, email, username, password } = req.body;
    try {
        const hashedPassword = hashPassword(password);
        await pool.query(
            'INSERT INTO employees (name, position, phone, email, username, password) VALUES (?, ?, ?, ?, ?, ?)',
            [name, position, phone, email, username, hashedPassword]
        );
        res.json({ success: true, message: 'Pegawai berhasil ditambahkan' });
    } catch (error) {
        console.error('[API ERROR] Add employee failed:', error);
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ success: false, message: 'Username atau Email sudah terdaftar.' });
        }
        res.status(500).json({ success: false, message: 'Gagal menambah pegawai: ' + error.message });
    }
});

app.put('/api/employees/:id', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { id } = req.params;
    const { name, position, phone, email, username, password } = req.body;
    
    try {
        if (password) {
            const hashedPassword = hashPassword(password);
            await pool.query(
                'UPDATE employees SET name=?, position=?, phone=?, email=?, username=?, password=? WHERE id=?',
                [name, position, phone, email, username, hashedPassword, id]
            );
        } else {
            await pool.query(
                'UPDATE employees SET name=?, position=?, phone=?, email=?, username=? WHERE id=?',
                [name, position, phone, email, username, id]
            );
        }
        res.json({ success: true, message: 'Data pegawai diperbarui' });
    } catch (error) {
        console.error('[API ERROR] Update employee failed:', error);
        res.status(500).json({ success: false, message: 'Gagal update pegawai: ' + error.message });
    }
});

app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM employees WHERE id = ?', [id]);
        res.json({ success: true, message: 'Pegawai dihapus' });
    } catch (error) {
         console.error('[API ERROR] Delete employee failed:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus pegawai: ' + error.message });
    }
});

// Upload API (Protected)
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ status: 'success', url: fileUrl });
});

// Transactions API (Protected)
app.get('/api/transactions', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    try {
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
        
        if (!rows || rows.length === 0) {
            return res.json([]);
        }

        const transactions = await Promise.all(rows.map(async (t) => {
            const [items] = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
            return {
                id: t.id,
                date: t.date,
                type: t.type,
                expenseType: t.expense_type,
                category: t.category,
                activityName: t.activity_name,
                description: t.description,
                grandTotal: parseFloat(t.grand_total || 0),
                items: (items || []).map(i => ({
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    price: parseFloat(i.price || 0),
                    total: parseFloat(i.total || 0),
                    filePreviewUrl: i.file_url 
                })),
                timestamp: new Date(t.created_at).getTime()
            };
        }));
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions', error: error.toString() });
    }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const t = req.body;
        
        await conn.query(
            'INSERT INTO transactions (id, date, type, expense_type, category, activity_name, description, grand_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [t.id, t.date, t.type, t.expenseType || null, t.category, t.activityName, t.description, t.grandTotal]
        );

        if (t.items && t.items.length > 0) {
            for (const item of t.items) {
                 await conn.query(
                    'INSERT INTO transaction_items (id, transaction_id, name, qty, price, total, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.id, t.id, item.name, item.qty, item.price, item.total, item.filePreviewUrl || null]
                 );
            }
        }

        await conn.commit();
        res.json({ status: 'success', message: 'Transaction saved' });
    } catch (error) {
        await conn.rollback();
        console.error('Error saving transaction:', error);
        res.status(500).json({ message: 'Failed to save transaction', error: error.message });
    } finally {
        conn.release();
    }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
        res.json({ status: 'success', message: 'Transaction deleted' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ message: 'Failed to delete transaction', error: error.message });
    }
});

app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const conn = await pool.getConnection();
    const { id } = req.params;
    const t = req.body;

    try {
        await conn.beginTransaction();
        await conn.query(
            'UPDATE transactions SET date=?, type=?, expense_type=?, category=?, activity_name=?, description=?, grand_total=? WHERE id=?',
            [t.date, t.type, t.expenseType || null, t.category, t.activityName, t.description, t.grandTotal, id]
        );
        await conn.query('DELETE FROM transaction_items WHERE transaction_id = ?', [id]);
        if (t.items && t.items.length > 0) {
            for (const item of t.items) {
                 await conn.query(
                    'INSERT INTO transaction_items (id, transaction_id, name, qty, price, total, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.id, id, item.name, item.qty, item.price, item.total, item.filePreviewUrl || null]
                 );
            }
        }
        await conn.commit();
        res.json({ status: 'success', message: 'Transaction updated' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ message: 'Failed to update transaction', error: error.message });
    } finally {
        conn.release();
    }
});

// Reimbursements API (Protected)
app.get('/api/reimbursements', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    try {
        let query = 'SELECT * FROM reimbursements';
        let params = [];

        // Filter jika user adalah employee
        if (req.user.role === 'employee') {
            query += ' WHERE requestor_name = ?';
            params.push(req.user.name);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.query(query, params);
        
        if (!rows || rows.length === 0) {
            return res.json([]);
        }

        const reimbursements = await Promise.all(rows.map(async (r) => {
            const [items] = await pool.query('SELECT * FROM reimbursement_items WHERE reimbursement_id = ?', [r.id]);
            return {
                id: r.id,
                date: r.date,
                requestorName: r.requestor_name,
                category: r.category,
                activityName: r.activity_name,
                description: r.description,
                grandTotal: parseFloat(r.grand_total || 0),
                status: r.status,
                transferProofUrl: r.transfer_proof_url,
                rejectionReason: r.rejection_reason,
                items: (items || []).map(i => ({
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    price: parseFloat(i.price || 0),
                    total: parseFloat(i.total || 0),
                    filePreviewUrl: i.file_url
                })),
                timestamp: new Date(r.created_at).getTime()
            };
        }));
        res.json(reimbursements);
    } catch (error) {
        console.error('Error fetching reimbursements:', error);
        res.status(500).json({ message: 'Error fetching reimbursements', error: error.toString() });
    }
});

app.post('/api/reimbursements', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const r = req.body;
        
        // Enforce requestor_name for employees
        const requestorName = req.user.role === 'employee' ? req.user.name : r.requestorName;

        await conn.query(
            'INSERT INTO reimbursements (id, date, requestor_name, category, activity_name, description, grand_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [r.id, r.date, requestorName, r.category, r.activityName, r.description, r.grandTotal, 'PENDING']
        );

        if (r.items && r.items.length > 0) {
            for (const item of r.items) {
                 await conn.query(
                    'INSERT INTO reimbursement_items (id, reimbursement_id, name, qty, price, total, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.id, r.id, item.name, item.qty, item.price, item.total, item.filePreviewUrl || null]
                 );
            }
        }

        await conn.commit();

        // Create Notification for Admin
        try {
            await pool.query(
                "INSERT INTO notifications (message, type, target_role, created_by) VALUES (?, 'info', 'admin', ?)",
                [`Pengajuan Baru: ${requestorName} - ${r.activityName} (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(r.grandTotal)})`, req.user.id]
            );
        } catch (notifErr) {
            console.error('[WARN] Failed to create admin notification:', notifErr);
        }

        res.json({ status: 'success', message: 'Reimbursement saved' });
    } catch (error) {
        await conn.rollback();
        console.error('Error saving reimbursement:', error);
        res.status(500).json({ message: 'Failed to save reimbursement', error: error.message });
    } finally {
        conn.release();
    }
});

app.put('/api/reimbursements/:id/details', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const conn = await pool.getConnection();
    const { id } = req.params;
    const r = req.body;

    try {
        await conn.beginTransaction();

        // Check permission for employees
        if (req.user.role === 'employee') {
            const [existing] = await conn.query('SELECT requestor_name, status FROM reimbursements WHERE id = ?', [id]);
            if (existing.length === 0) {
                await conn.rollback();
                return res.status(404).json({ message: 'Reimbursement not found' });
            }
            const reimb = existing[0];
            
            // Ownership check
            if (reimb.requestor_name !== req.user.name) {
                 await conn.rollback();
                 return res.status(403).json({ message: 'Unauthorized' });
            }

            // Status check (only PENDING or DITOLAK can be edited)
            if (reimb.status !== 'PENDING' && reimb.status !== 'DITOLAK') {
                await conn.rollback();
                return res.status(403).json({ message: 'Cannot edit reimbursement that is already processed' });
            }
        }

        const requestorName = req.user.role === 'employee' ? req.user.name : r.requestorName;

        await conn.query(
            'UPDATE reimbursements SET date=?, requestor_name=?, category=?, activity_name=?, description=?, grand_total=?, status=? WHERE id=?',
            [r.date, requestorName, r.category, r.activityName, r.description, r.grandTotal, 'PENDING', id]
        );
        await conn.query('DELETE FROM reimbursement_items WHERE reimbursement_id = ?', [id]);
        if (r.items && r.items.length > 0) {
            for (const item of r.items) {
                 await conn.query(
                    'INSERT INTO reimbursement_items (id, reimbursement_id, name, qty, price, total, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.id, id, item.name, item.qty, item.price, item.total, item.filePreviewUrl || null]
                 );
            }
        }
        await conn.commit();
        res.json({ status: 'success', message: 'Reimbursement details updated' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ message: 'Failed to update reimbursement', error: error.message });
    } finally {
        conn.release();
    }
});

app.delete('/api/reimbursements/:id', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    
    // Employees cannot delete
    if (req.user.role === 'employee') {
        return res.status(403).json({ message: 'Employees cannot delete reimbursements' });
    }

    const { id } = req.params;
    try {
        await pool.query('DELETE FROM reimbursements WHERE id = ?', [id]);
        res.json({ status: 'success', message: 'Reimbursement deleted' });
    } catch (error) {
        console.error('Error deleting reimbursement:', error);
        res.status(500).json({ message: 'Failed to delete reimbursement', error: error.message });
    }
});

app.put('/api/reimbursements/:id', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    const { id } = req.params;
    const { status, rejectionReason, transferProofUrl } = req.body;
    
    try {
        await pool.query(
            'UPDATE reimbursements SET status = ?, rejection_reason = ?, transfer_proof_url = IFNULL(?, transfer_proof_url) WHERE id = ?',
            [status, rejectionReason || null, transferProofUrl || null, id]
        );

        // --- AUTO NOTIFICATION LOGIC ---
        try {
            // Get Reimbursement Details
            const [rows] = await pool.query('SELECT requestor_name, activity_name FROM reimbursements WHERE id = ?', [id]);
            if (rows.length > 0) {
                const r = rows[0];
                
                // Find Employee ID based on Name
                const [empRows] = await pool.query('SELECT id FROM employees WHERE name = ?', [r.requestor_name]);
                let userId = null;
                if (empRows.length > 0) {
                    userId = empRows[0].id;
                }

                // Create Notification Message
                let message = `Pengajuan ${r.activity_name} telah diperbarui menjadi ${status}`;
                let type = 'info';

                if (status === 'BERHASIL') {
                    message = `Selamat! Pengajuan ${r.activity_name} telah DISETUJUI dan dibayarkan.`;
                    type = 'success';
                } else if (status === 'DITOLAK') {
                    message = `Mohon Maaf. Pengajuan ${r.activity_name} DITOLAK.`;
                    type = 'error';
                }

                // Insert into Notifications Table
                // Only if userId found or we want to broadcast? No, targeted only.
                if (userId) {
                    await pool.query(
                        'INSERT INTO notifications (user_id, message, type, created_by) VALUES (?, ?, ?, ?)',
                        [userId, message, type, req.user.id]
                    );
                } else {
                     console.warn(`[WARN] Could not find user_id for requestor: ${r.requestor_name}. Notification skipped.`);
                }
            }
        } catch (notifError) {
            console.error('[WARN] Failed to create auto-notification:', notifError);
            // Non-blocking error
        }
        // -------------------------------

        res.json({ status: 'success', message: 'Status updated' });
    } catch (error) {
        console.error('Error updating reimbursement:', error);
        res.status(500).json({ message: 'Failed to update status', error: error.message });
    }
});

// Serve Static Frontend & Uploads MOVED TO BOTTOM

// --- NOTIFICATIONS API ---
// Duplicate test-db removed

app.get('/api/notifications', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    
    const userId = req.user.id;
    const role = req.user.role;
    const requestorName = req.user.name || req.user.full_name || req.user.username;

    try {
        let count = 0;
        let notifications = [];

        if (role === 'admin') {
            // Admin: Fetch notifications from DB (target_role = 'admin')
            const [rows] = await pool.query(
                "SELECT * FROM notifications WHERE target_role = 'admin' ORDER BY created_at DESC LIMIT 50"
            );
            
            notifications = rows.map(n => ({
                id: n.id,
                message: n.message,
                type: n.type,
                is_read: n.is_read,
                timestamp: n.created_at
            }));

            // Count unread
            count = notifications.filter(n => !n.is_read).length;
        } else {
            // Employee: 
            // 1. Manual Notifications (Targeted or Broadcast)
            const [manualNotifs] = await pool.query(
                "SELECT * FROM notifications WHERE (user_id = ? OR (user_id IS NULL AND target_role = 'employee')) ORDER BY created_at DESC LIMIT 20", 
                [userId]
            );

            manualNotifs.forEach(n => {
                notifications.push({
                    id: `manual-${n.id}`,
                    message: n.message,
                    type: n.type || 'info',
                    timestamp: n.created_at
                });
            });

            // 2. Count PENDING reimbursements
            const [pendingRows] = await pool.query("SELECT COUNT(*) as count FROM reimbursements WHERE requestor_name = ? AND status = 'PENDING'", [requestorName]);
            const pendingCount = pendingRows[0].count;

            if (pendingCount > 0) {
                 notifications.push({
                    id: 'emp-pending',
                    message: `${pendingCount} Pengajuan Sedang Diproses`,
                    type: 'info'
                });
            }
            
            count = notifications.length;
        }

        res.json({ count, notifications });

    } catch (error) {
        console.error('[API ERROR] Get notifications failed:', error);
        res.status(500).json({ message: 'Gagal mengambil notifikasi' });
    }
});

// Mark All Read (Admin)
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE target_role = 'admin'");
        res.json({ success: true });
    } catch (error) {
        console.error('[API ERROR] Mark all read failed:', error);
        res.status(500).json({ message: 'Gagal update status notifikasi' });
    }
});

// Clear All Notifications (Admin)
app.delete('/api/notifications/clear-all', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        await pool.query("DELETE FROM notifications WHERE target_role = 'admin'");
        res.json({ success: true });
    } catch (error) {
        console.error('[API ERROR] Clear all notifications failed:', error);
        res.status(500).json({ message: 'Gagal menghapus notifikasi' });
    }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    
    // Only admin can create notifications
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    const { userId, message, type } = req.body; // userId null means broadcast

    try {
        await pool.query(
            'INSERT INTO notifications (user_id, message, type, created_by) VALUES (?, ?, ?, ?)',
            [userId || null, message, type || 'info', req.user.id]
        );
        res.json({ success: true, message: 'Notifikasi berhasil dikirim' });
    } catch (error) {
        console.error('[API ERROR] Post notification failed:', error);
        res.status(500).json({ message: 'Gagal mengirim notifikasi' });
    }
});

app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        // Join with employees table to get recipient name
        const query = `
            SELECT n.*, e.name as recipient_name 
            FROM notifications n 
            LEFT JOIN employees e ON n.user_id = e.id 
            ORDER BY n.created_at DESC
        `;
        const [rows] = await pool.query(query);
        
        console.log(`[DEBUG] Admin fetching notifications. Found ${rows.length} rows.`);

        const notifications = rows.map(row => ({
            ...row,
            recipient_name: row.user_id ? (row.recipient_name || 'Unknown User') : 'Semua Pegawai (Broadcast)'
        }));

        res.json(notifications);
    } catch (error) {
        console.error('[API ERROR] Get admin notifications failed:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat notifikasi' });
    }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
    if (!pool) return res.status(500).json({ message: 'DB not connected' });

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    try {
        await pool.query('DELETE FROM notifications WHERE id = ?', [id]);
        res.json({ success: true, message: 'Notifikasi berhasil dihapus' });
    } catch (error) {
        console.error('[API ERROR] Delete notification failed:', error);
        res.status(500).json({ message: 'Gagal menghapus notifikasi' });
    }
});

// Serve Static Frontend & Uploads (MUST BE LAST)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(publicPath)) {
    console.log(`[INFO] Serving static files from: ${publicPath}`);
    app.use(express.static(publicPath));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/uploads')) {
            return res.status(404).json({ message: 'Not Found' });
        }
        res.sendFile(path.join(publicPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => res.send('Server Running. Please run npm run build inside root directory.'));
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
