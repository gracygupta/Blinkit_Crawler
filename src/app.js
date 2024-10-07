const express = require('express');
const logger = require('morgan');
const axios = require('axios');
require('dotenv').config();

const http = require('http');
const cors = require('cors');
const pino = require('./config/logger');

require('./config/firebase.config');

const app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('port', process.env.PORT);
app.use(cors());


const server = http.createServer(app);

app.get("/", async (req, res) => {
    res.status(200).json({ message: "Connected to server" });
})
app.use('/', require('./routes'));


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(statusCode.resource_not_found));
});

// error handler
app.use(function (err, req, res) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || statusCode.server_error_code);
    res.json('error');
});


//Promise Handler
process.on('unhandledRejection', (error) => {
    console.trace('unhandledRejection Error', error);
    pino.error(`unhandledRejection Error: ${error}`);
});

process.on('uncaughtException', (error) => {
    console.error('uncaughtException Error', error);
    pino.error(`uncaughtException Error: ${error}`);
}); // Ignore error

server.listen(process.env.PORT);
server.on('listening', () => {
    pino.info(`${process.env.PRODUCT_NAME} is running on ${process.env.PORT} port....`);
});

module.exports = app;


