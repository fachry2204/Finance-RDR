
const mysql = require('mysql2/promise');

async function check() {
    try {
        const pool = await mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'rdr_admin'
        });
        
        const [rows] = await pool.query('DESCRIBE categories');
        console.log('Categories:', rows);
        
        const [users] = await pool.query('SELECT * FROM users');
        // console.log('Users:', users);
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
