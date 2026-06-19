const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "apiit_fyp_management_system",
    password: "ApiitFYP@2026",
    port: 5432,
});

module.exports = pool;