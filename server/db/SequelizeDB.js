// db/SequelizeDB.js
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Sequelize } = require("sequelize");
const { Pool, types } = require("pg");

/* ---------------- Date Parser Fix ---------------- */
// Force DATE (OID 1082) to be returned as a string, not a JS Date object
types.setTypeParser(1082, (value) => value);

/* ---------------- 1. Sequelize (ORM) ---------------- */
const sequelize = new Sequelize(
    process.env.PSQL_DATABASE,
    process.env.PSQL_USER,
    process.env.PSQL_PASSWORD,
    {
        host: process.env.PSQL_HOST,
        port: Number(process.env.PSQL_PORT) || 5432,
        dialect: "postgres",
        logging: false, // Set to console.log to see SQL queries
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        define: { timestamps: false, freezeTableName: true }
    }
);

/* ---------------- 2. PG Pool (Raw Queries) ---------------- */
const db = new Pool({
    host: process.env.PSQL_HOST,
    user: process.env.PSQL_USER,
    port: Number(process.env.PSQL_PORT) || 5432,
    password: process.env.PSQL_PASSWORD,
    database: process.env.PSQL_DATABASE,
    max: 20, // Max number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error if a connection takes too long
});

// Handle unexpected errors on idle clients
db.on("error", (err) => {
    console.error("Unexpected PG pool error:", err);
});

/* ---------------- 3. Unified Connect Helper ---------------- */
const connectDB = async () => {
    try {
        // Test Sequelize
        await sequelize.authenticate();
        console.log("✅ Sequelize connected successfully.");

        // Test PG Pool
        const client = await db.connect();
        console.log("✅ PostgreSQL Pool connected successfully.");
        client.release(); // Crucial: Release it back to the pool!

    } catch (err) {
        console.error("❌ DB Connection Error:", err.message);
        process.exit(1);
    }
};

module.exports = {
    sequelize,
    db, 
    connectDB
};