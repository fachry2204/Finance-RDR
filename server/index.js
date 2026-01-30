
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
// Gunakan Environment Variables untuk keamanan
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'keuangan_rdr'
};

let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log('Database configuration loaded.');
} catch (err) {
    console.error('Database configuration error:', err);
}

// --- GOOGLE DRIVE OAUTH2 SETUP ---
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // e.g., http://localhost:3000/auth/google/callback
);

// File upload handling (Temporary storage before upload to Drive)
const upload = multer({ dest: 'uploads/' });

// --- ROUTES ---

// 1. TEST DB CONNECTION
app.get('/api/test-db', async (req, res) => {
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

// 2. GOOGLE AUTH START
app.get('/auth/google', (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/drive.file'];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force refresh token generation
    });
    res.json({ url });
});

// 3. GOOGLE AUTH CALLBACK
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Simpan token ke file atau database (disini kita simpan ke file sederhana json)
        fs.writeFileSync('tokens.json', JSON.stringify(tokens));
        
        // Redirect kembali ke Frontend Settings Page
        res.redirect('http://localhost:5173/settings?status=drive_connected');
    } catch (error) {
        console.error('Error retrieving access token', error);
        res.redirect('http://localhost:5173/settings?status=drive_failed');
    }
});

// Helper: Load Token if exists
const loadTokens = () => {
    if (fs.existsSync('tokens.json')) {
        const tokens = JSON.parse(fs.readFileSync('tokens.json'));
        oauth2Client.setCredentials(tokens);
        return true;
    }
    return false;
};

// 4. UPLOAD TO DRIVE
app.post('/api/upload-drive', upload.single('file'), async (req, res) => {
    if (!loadTokens()) {
        return res.status(401).json({ message: 'Google Drive belum terhubung.' });
    }

    const { folderId } = req.body; // ID folder dari frontend settings
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
        const fileMetadata = {
            name: file.originalname,
            parents: folderId && folderId !== 'root' ? [folderId] : []
        };
        const media = {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.path)
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink'
        });

        // Cleanup local file
        fs.unlinkSync(file.path);

        res.json({
            status: 'success',
            fileId: response.data.id,
            url: response.data.webViewLink
        });
    } catch (error) {
        console.error('Drive Upload Error:', error);
        res.status(500).json({ message: 'Upload ke Drive gagal', error: error.message });
    }
});

// 5. SAVE TRANSACTION (Example of CRUD)
app.post('/api/transactions', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id, date, type, expenseType, category, activityName, description, grandTotal, items } = req.body;

        // Insert Header
        await conn.query(
            `INSERT INTO transactions (id, date, type, expense_type, category, activity_name, description, grand_total) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, date, type, expenseType, category, activityName, description, grandTotal]
        );

        // Insert Items
        for (const item of items) {
            await conn.query(
                `INSERT INTO transaction_items (id, transaction_id, name, qty, price, total, file_url, drive_file_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [item.id, id, item.name, item.qty, item.price, item.total, item.filePreviewUrl, item.driveFileId]
            );
        }

        await conn.commit();
        res.json({ status: 'success', message: 'Transaksi tersimpan' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Gagal menyimpan transaksi' });
    } finally {
        conn.release();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
