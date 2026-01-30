
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
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- SERVE STATIC FRONTEND ---
// Karena build vite sekarang ada di folder 'public' di dalam folder server ini
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(publicPath)) {
    console.log(`[INFO] Serving static files from: ${publicPath}`);
    app.use(express.static(publicPath));
} else {
    console.warn(`[WARN] Folder public tidak ditemukan. Pastikan Anda sudah menjalankan 'npm run build'.`);
}

// --- DATABASE CONNECTION ---
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
let oauth2Client = null;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

const upload = multer({ dest: 'uploads/' });

// --- API ROUTES ---

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

app.get('/auth/google', (req, res) => {
    if (!oauth2Client) return res.status(500).json({ message: 'Google Client ID belum dikonfigurasi.' });
    const scopes = ['https://www.googleapis.com/auth/drive.file'];
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent' });
    res.json({ url });
});

app.get('/auth/google/callback', async (req, res) => {
    if (!oauth2Client) return res.status(500).send('OAuth Client not configured');
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.writeFileSync('tokens.json', JSON.stringify(tokens));
        res.redirect('/settings?status=drive_connected');
    } catch (error) {
        console.error(error);
        res.redirect('/settings?status=drive_failed');
    }
});

const loadTokens = () => {
    if (!oauth2Client) return false;
    if (fs.existsSync('tokens.json')) {
        const tokens = JSON.parse(fs.readFileSync('tokens.json'));
        oauth2Client.setCredentials(tokens);
        return true;
    }
    return false;
};

app.post('/api/upload-drive', upload.single('file'), async (req, res) => {
    if (!loadTokens()) return res.status(401).json({ message: 'Google Drive belum terhubung.' });
    const { folderId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    try {
        const fileMetadata = {
            name: file.originalname,
            parents: folderId && folderId !== 'root' ? [folderId] : []
        };
        const media = { mimeType: file.mimetype, body: fs.createReadStream(file.path) };
        const response = await drive.files.create({
            requestBody: fileMetadata, media: media, fields: 'id, webViewLink'
        });
        fs.unlinkSync(file.path);
        res.json({ status: 'success', fileId: response.data.id, url: response.data.webViewLink });
    } catch (error) {
        res.status(500).json({ message: 'Upload gagal', error: error.message });
    }
});

// --- CATCH ALL ROUTE (SPA HANDLER) ---
if (fs.existsSync(publicPath)) {
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
            return res.status(404).json({ message: 'API Endpoint Not Found' });
        }
        res.sendFile(path.join(publicPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => res.send('Server Running. Please run npm run build inside root directory.'));
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
