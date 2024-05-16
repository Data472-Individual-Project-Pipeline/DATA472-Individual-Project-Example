const https = require("https");
const fs = require("fs");
const unzipper = require("unzipper");
const path = require("path");
const { Client } = require("pg");
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const { CronJob } = require("cron");
const winston = require("winston");
const { format } = require("winston");
const retry = require("async-retry");
require("dotenv").config();
const cors = require("cors");

const logDir = "log";

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Create a logger
const logger = winston.createLogger({
    level: "info",
    format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: `log/${new Date().toISOString().split("T")[0]}.log`,
            datePattern: "YYYY-MM-DD",
            prepend: true,
        }),
    ],
});

const clientConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
};

const url = process.env.DATA_URL;
const filePath = "./data.zip";
const extractPath = "./";
const jsonFileName = "data.json";

class StationItem {
    constructor(data) {
        this.StationCode = data.StationCode;
        this.StationName = data.StationName;
        this.StationShortName = data.StationShortName;
        this.StationLocation = data.StationLocation;
        this.StationCity = data.StationCity;
        this.StationLatitude = data.StationLatitude;
        this.StationLongitude = data.StationLongitude;
        this.MonitorChannel = data.MonitorChannel;
        this.MonitorName = data.MonitorName;
        this.MonitorTypeCode = data.MonitorTypeCode;
        this.MonitorTypeDescription = data.MonitorTypeDescription;
        this.MonitorFullName = data.MonitorFullName;
    }
}

async function connectToDatabase(client) {
    try {
        await client.connect();
        logger.info("Connected to PostgreSQL database");
    } catch (err) {
        logger.error("Failed to connect to PostgreSQL database:", err);
        process.exit(1); // Exit the process with a non-zero status code
    }
}

async function closeDatabase(client) {
    try {
        await client.end();
        logger.info("Disconnected from PostgreSQL database");
    } catch (err) {
        logger.error("Failed to disconnect from PostgreSQL database:", err);
    }
}

async function insertItems(items) {
    const client = new Client(clientConfig);
    await connectToDatabase(client);
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS hua_aqi_stations (
                id SERIAL PRIMARY KEY,
                StationCode TEXT,
                StationName TEXT,
                StationShortName TEXT,
                StationLocation TEXT,
                StationCity TEXT,
                StationLatitude REAL,
                StationLongitude REAL,
                MonitorChannel TEXT,
                MonitorName TEXT,
                MonitorTypeCode TEXT,
                MonitorTypeDescription TEXT,
                MonitorFullName TEXT,
                insertTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        let count = 0;
        let duplicateCount = 0;

        for (const item of items) {
            const res = await client.query(
                `SELECT * FROM hua_aqi_stations WHERE 
                    StationCode = $1 AND 
                    StationName = $2 AND 
                    StationShortName = $3 AND 
                    StationLocation = $4 AND 
                    StationCity = $5 AND 
                    StationLatitude = $6 AND 
                    StationLongitude = $7 AND 
                    MonitorChannel = $8 AND 
                    MonitorName = $9 AND 
                    MonitorTypeCode = $10 AND 
                    MonitorTypeDescription = $11 AND 
                    MonitorFullName = $12`,
                [
                    item.StationCode,
                    item.StationName,
                    item.StationShortName,
                    item.StationLocation,
                    item.StationCity,
                    item.StationLatitude,
                    item.StationLongitude,
                    item.MonitorChannel,
                    item.MonitorName,
                    item.MonitorTypeCode,
                    item.MonitorTypeDescription,
                    item.MonitorFullName,
                ]
            );

            if (res.rows.length > 0) {
                duplicateCount++;
            } else {
                await client.query(
                    `INSERT INTO hua_aqi_stations (
                        StationCode, StationName, StationShortName, StationLocation, StationCity,
                        StationLatitude, StationLongitude, MonitorChannel, MonitorName,
                        MonitorTypeCode, MonitorTypeDescription, MonitorFullName
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                    )`,
                    [
                        item.StationCode,
                        item.StationName,
                        item.StationShortName,
                        item.StationLocation,
                        item.StationCity,
                        item.StationLatitude,
                        item.StationLongitude,
                        item.MonitorChannel,
                        item.MonitorName,
                        item.MonitorTypeCode,
                        item.MonitorTypeDescription,
                        item.MonitorFullName,
                    ]
                );

                count++;
            }
        }

        logger.info(`${count} items inserted.`);
        logger.info(`${duplicateCount} items were duplicates and not inserted.`);
    } catch (err) {
        logger.error("Error inserting items:", err.message);
    } finally {
        await closeDatabase(client);
    }
}

async function downloadFile() {
    await retry(
        async () => {
            return new Promise((resolve, reject) => {
                const request = https.get(url, function (response) {
                    if (response.statusCode !== 200) {
                        const error = new Error(`Failed to get '${url}' (${response.statusCode})`);
                        logger.error(`Error downloading the file: ${error.message}`);
                        reject(error);
                        return;
                    }

                    const fileStream = fs.createWriteStream(filePath);
                    response.pipe(fileStream);

                    fileStream.on("finish", function () {
                        fileStream.close(resolve);
                    });

                    fileStream.on("error", function (err) {
                        logger.error(`Error writing to file: ${err.message}`);
                        fs.unlink(filePath, () => reject(err));
                    });
                });

                request.on("error", function (err) {
                    logger.error(`Error with HTTPS request: ${err.message}`);
                    fs.unlink(filePath, () => reject(err));
                });
            });
        },
        {
            retries: 3, // Retry 3 times
            minTimeout: 1000, // Wait 1 second between retries
        }
    ).catch((err) => {
        logger.error("Error downloading the file after retries:", err.message);
    });
}

async function unzipAndReadFile() {
    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: extractPath }))
            .on("close", resolve)
            .on("error", reject);
    })
    .then(() => {
        readAndProcessJson(jsonFileName);
    })
    .catch((err) => {
        logger.error("Error unzipping file:", err.message);
    });
}

function readAndProcessJson(file) {
    fs.readFile(path.join(extractPath, file), function (err, data) {
        if (err) {
            logger.error("Error reading file:", err.message);
            return;
        }

        const jsonData = JSON.parse(data);

        if (jsonData.data && Array.isArray(jsonData.data.item)) {
            const items = jsonData.data.item.map((data) => new StationItem(data));
            insertItems(items).catch((err) => logger.error("Error inserting items:", err.message));
        } else {
            logger.error("Invalid JSON structure:", jsonData);
        }
    });
}

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type StationItem {
    StationCode: String
    StationName: String
    StationShortName: String
    StationLocation: String
    StationCity: String
    StationLatitude: Float
    StationLongitude: Float
    MonitorChannel: String
    MonitorName: String
    MonitorTypeCode: String
    MonitorTypeDescription: String
    MonitorFullName: String
  }

  type Query {
    stationItem(StationCode: String): StationItem
    stationItems: [StationItem]
  }
`);

// The root provides a resolver function for each API endpoint
const root = {
    stationItems: async (args, context) => {
        const { req } = context;
        const client = new Client(clientConfig);
        await connectToDatabase(client);
        try {
            const res = await client.query("SELECT * FROM hua_aqi_stations");
            logger.info(`Fetched ${res.rows.length} stationItems`);
            logger.info(`Client IP: ${req.ip}, User-Agent: ${req.headers["user-agent"]}`);
            const results = res.rows.map((row) => ({
                StationCode: row.stationcode,
                StationName: row.stationname,
                StationShortName: row.stationshortname,
                StationLocation: row.stationlocation,
                StationCity: row.stationcity,
                StationLatitude: row.stationlatitude,
                StationLongitude: row.stationlongitude,
                MonitorChannel: row.monitorchannel,
                MonitorName: row.monitorname,
                MonitorTypeCode: row.monitortypecode,
                MonitorTypeDescription: row.monitortypedescription,
                MonitorFullName: row.monitorfullname,
            }));
            return results;
        } catch (err) {
            logger.error("Error fetching stationItems:", err.message);
            throw err;
        } finally {
            await closeDatabase(client);
        }
    },
};

const app = express();
app.use(cors());

app.use((req, res, next) => {
    req.ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    next();
});

app.use(
    "/graphql",
    graphqlHTTP((req) => ({
        schema: schema,
        rootValue: root,
        graphiql: true,
        context: { req },
    }))
);

app.listen(4000, () => logger.info("Now browse to localhost:4000/graphql"));

const job = new CronJob(
    "*/30 * * * * *",
    function () {
        downloadFile().then(() => {
            unzipAndReadFile();
        }).catch((err) => {
            logger.error("Error during download or unzip:", err.message);
        });
    },
    null,
    true,
    "Pacific/Auckland"
);

job.start();
