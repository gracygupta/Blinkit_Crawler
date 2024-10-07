const express = require('express');
const logger = require('../config/logger.js');
const app = express();

app.use(function (req, res, next) {
    if (req.url.includes('//')) {
        logger.info('included //');
        const err = new Error('Resource Not Found');
        err.status = 404;
        const resources = {};
        res.status(404);
        resources.status = err.status;
        resources.message = 'Resource Not Found';
        return res.json(resources);
    } else {
        next();
    }
});

// Blinkit API
app.use('/api/', require('./Blinkit/products.js'));

app.use(function (req, res) {
    const err = new Error('Resource Not Found');
    err.status = 404;
    const resources = {};
    res.status(404);
    resources.status = err.status;
    resources.message = err.message;
    return res.json(resources);
});

module.exports = app;
