# Individual Project Example

## 1. Introduction

This is a pre-research project that the Central Collection Team made it to guide individual students to get start their project in Data472. It is based on the data from the website of [ECAN](https://data.ecan.govt.nz).

[online demo](http://http://3.27.162.136/hua/graphql?query=%23%20Welcome%20to%20GraphiQL%0A%23%0A%23%20GraphiQL%20is%20an%20in-browser%20tool%20for%20writing%2C%20validating%2C%20and%0A%23%20testing%20GraphQL%20queries.%0A%23%0A%23%20Type%20queries%20into%20this%20side%20of%20the%20screen%2C%20and%20you%20will%20see%20intelligent%0A%23%20typeaheads%20aware%20of%20the%20current%20GraphQL%20type%20schema%20and%20live%20syntax%20and%0A%23%20validation%20errors%20highlighted%20within%20the%20text.%0A%23%0A%23%20GraphQL%20queries%20typically%20start%20with%20a%20%22%7B%22%20character.%20Lines%20that%20start%0A%23%20with%20a%20%23%20are%20ignored.%0A%23%0A%23%20An%20example%20GraphQL%20query%20might%20look%20like%3A%0A%23%0A%23%20%20%20%20%20%7B%0A%23%20%20%20%20%20%20%20field(arg%3A%20%22value%22)%20%7B%0A%23%20%20%20%20%20%20%20%20%20subField%0A%23%20%20%20%20%20%20%20%7D%0A%23%20%20%20%20%20%7D%0A%23%0A%23%20Keyboard%20shortcuts%3A%0A%23%0A%23%20%20Prettify%20Query%3A%20%20Shift-Ctrl-P%20(or%20press%20the%20prettify%20button%20above)%0A%23%0A%23%20%20%20%20%20Merge%20Query%3A%20%20Shift-Ctrl-M%20(or%20press%20the%20merge%20button%20above)%0A%23%0A%23%20%20%20%20%20%20%20Run%20Query%3A%20%20Ctrl-Enter%20(or%20press%20the%20play%20button%20above)%0A%23%0A%23%20%20%20Auto%20Complete%3A%20%20Ctrl-Space%20(or%20just%20start%20typing)%0A%23%0A%0A%7B%0A%20%20stationItems%20%7B%0A%20%20%20%20StationCode%0A%20%20%20%20StationName%0A%20%20%20%20StationShortName%0A%20%20%20%20StationLocation%0A%20%20%20%20StationCity%0A%20%20%20%20StationLatitude%0A%20%20%20%20StationLongitude%0A%20%20%20%20MonitorChannel%0A%20%20%20%20MonitorName%0A%20%20%20%20MonitorTypeCode%0A%20%20%20%20MonitorTypeDescription%0A%20%20%20%20MonitorFullName%0A%20%20%7D%0A%7D%0A)

[Visualisation by the WebAPI above](http://http://3.27.162.136/hua/aqi/)

## 2. Project Structure

The project consists of the following main components:

- **Data Downloading**: The script downloads a zip file containing air quality data from the ECAN website.
- **Data Unzipping and Processing**: The downloaded zip file is unzipped, and the JSON file inside it is read and processed.
- **Data Insertion**: The processed data is inserted into a PostgreSQL database.
- **GraphQL API**: A GraphQL API is set up to allow querying of the data.
- **Logging**: The project uses Winston for logging.
- **Scheduled Task**: A cron job is set up to download the data daily.

## 3. Installation

### Pre-requisites

1. **Node.js**: The project is built using Node.js and npm. You can download Node.js from [here](https://nodejs.org/).
2. **PostgreSQL**: The project uses PostgreSQL as the database. You can download PostgreSQL from [here](https://www.postgresql.org/).

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
    DATABASE_URL=postgresql://username:password@database-address:port/default-database-name
    DATA_URL=https://data.ecan.govt.nz:443/data/180/Air/Air%20quality%20all%20stations%20and%20monitor%20channels/CSV?zip=1
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

For questions or support, please open an issue on GitHub or contact the Central Collection Team.

Feel free to modify and extend this README file as needed to fit the specifics of your project.
