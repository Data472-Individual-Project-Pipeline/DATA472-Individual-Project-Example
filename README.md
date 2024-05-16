# Individual Example

## 1. Introduction

This is a pre-research project that the Central Collection Team made it to guide individual students to get start their project in Data472. It is based on the data from the website of [ECAN](https://data.ecan.govt.nz).

## 2. Project Structure

The project consists of the following main components:

- **Data Downloading**: The script downloads a zip file containing air quality data from the ECAN website.
- **Data Unzipping and Processing**: The downloaded zip file is unzipped, and the JSON file inside it is read and processed.
- **Data Insertion**: The processed data is inserted into a PostgreSQL database.
- **GraphQL API**: A GraphQL API is set up to allow querying of the data.
- **Logging**: The project uses Winston for logging.
- **Scheduled Task**: A cron job is set up to download the data daily.

## 3. Installation

To set up the project, follow these steps:

1. **Clone the repository**:
    ```sh
    git clone git@github.com:Data472-Individual-Project-Pipeline/Individual-example.git
    cd Individual-example
    ```

2. **Install dependencies**:
    ```sh
    npm install
    ```

3. **Set up the environment variables**:
    Create a `.env` file in the root of the project and add the following variables: 
    ```env
    DATABASE_URL=your_postgresql_database_url
    DATA_URL=your_data_url (optional, default is provided in the code)
    ```

## 4. Usage

### Running the Project

1. **Start the PostgreSQL database**:
    Ensure your PostgreSQL server is running and accessible via the connection string provided in the `.env` file.

2. **Start the application**:
    ```sh
    node app.js
    ```

3. **Access the GraphQL API**:
    Open your browser and navigate to `http://localhost:4000/graphql` to interact with the GraphQL API.

### GraphQL API Endpoints

- **Query stationItems**:
  
    ```graphql
    query {
      stationItems {
        StationCode
        StationName
        StationShortName
        StationLocation
        StationCity
        StationLatitude
        StationLongitude
        MonitorChannel
        MonitorName
        MonitorTypeCode
        MonitorTypeDescription
        MonitorFullName
      }
    }
    ```

## 5. Code Overview

### Dependencies

- **https**: For making HTTP requests.
- **fs**: For file system operations.
- **unzipper**: For unzipping files.
- **path**: For handling file paths.
- **pg**: For connecting to PostgreSQL.
- **express**: For setting up the server.
- **express-graphql**: For integrating GraphQL with Express.
- **graphql**: For building the GraphQL schema.
- **cron**: For scheduling tasks.
- **winston**: For logging.
- **async-retry**: For retrying asynchronous operations.

### Key Functions

- **connectToDatabase**: Connects to the PostgreSQL database.
- **insertItems**: Inserts data into the PostgreSQL database, avoiding duplicates.
- **downloadFile**: Downloads the data file from the specified URL, with retry logic.
- **unzipAndReadFile**: Unzips the downloaded file and processes the JSON data.
- **readAndProcessJson**: Reads and processes the JSON file, transforming it into a list of `StationItem` objects.

### Class Definitions

- **StationItem**: Represents a data item from the JSON file with relevant fields.

## 6. Logging

The project uses Winston for logging. Logs are written to the console and to daily rotating log files in the `log` directory.

## 7. Scheduled Task

A cron job is set up to run daily at midnight (Pacific/Auckland time) to download and process the latest data.

```js
const job = new CronJob(
    "0 0 0 * * *",
    function () {
        downloadFile();
    },
    null,
    true,
    "Pacific/Auckland"
);
job.start();
```

## 8. Error Handling

Error handling is implemented throughout the project, with errors being logged and, in critical cases, the process exiting with a non-zero status code.

## 9. Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 10. License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 11. Contact

For questions or support, please open an issue on GitHub or contact the project maintainers.

Feel free to modify and extend this README file as needed to fit the specifics of your project.
