const express = require('express');
const router = express.Router();

const { fetchProductDetails, fetchAllProductsByCity } = require('../../controllers/fetchProductDetails');

// POST route to fetch products for a specific city
router.post('/fetch-products', fetchProductDetails);

// GET route to get products for a specific city
router.get('/fetch-products', fetchAllProductsByCity);

module.exports = router;