
require("dotenv").config({
    path: require("path").join(__dirname, "..", ".env")
});

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.PSQL_DATABASE,
    process.env.PSQL_USER,
    process.env.PSQL_PASSWORD,
    {
        host: process.env.PSQL_HOST,
        port: Number(process.env.PSQL_PORT) || 5432,
        dialect: "postgres",
        logging: false,

        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },

        define: {
            timestamps: false,
            freezeTableName: true
        }
    }
);

async function connectDB() {
    try {
        await sequelize.authenticate();

        console.log(
            "PostgreSQL connected successfully using Sequelize."
        );
    } catch (error) {
        console.error(
            "PostgreSQL connection failed:",
            error.message
        );

        throw error;
    }
}

module.exports = {
    sequelize,
    connectDB
};

if (require.main === module) {
    connectDB()
        .then(async () => {
            await sequelize.close();
        })
        .catch(() => {
            process.exitCode = 1;
        });
}