
require('dotenv').config();

const db = require('./config/database');

async function checkOwner() {
    try {
        const [rows] = await db.query(
            'SELECT id, username, email, role FROM users WHERE role = ?',
            ['owner']
        );

        console.table(rows);

        console.log('OWNER ACCOUNTS:', rows.length);

        if (rows.length > 0) {
            console.log('SUCCESS: Owner account exists in Aiven!');
        } else {
            console.log('WARNING: No owner account found.');
        }

        process.exit(0);

    } catch (error) {
        console.error('DATABASE ERROR:', error.message);
        process.exit(1);
    }
}

checkOwner();
