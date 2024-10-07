const express = require('express');
const router = express.Router();

const { fetchProductDetails } = require('../../controllers/fetchProductDetails');

// POST route to fetch products for a specific city
router.post('/fetch-products', fetchProductDetails);

module.exports = router;