const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'crud-biblioteca',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
        process.exit(1); // Exit if we can't connect to the database
    });

// Wrap the pool.query to include better error handling
const query = async (sql, params) => {
    try {
        console.log('Executing query:', sql, 'with params:', params);
        const [results] = await pool.query(sql, params);
        console.log('Query results:', results);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

module.exports = {
    pool,
    query
};