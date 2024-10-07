const { ReS, getCityCoordinates } = require('../service/general.helper');
const constants = require('../config/constants');
const logger = require('../config/logger');
const { fetchCategories, runWorker } = require('../service/categories.helper');
const { firestore } = require('../config/firebase.config');


const fetchProductDetails = async (req, res) => {
    const { city } = req.body;  // Get the city from the request body

    if (!city) {
        return ReS(res, constants.bad_request_code, 'City is required');
    }

    try {
        // Step 1: Get lat/lon for the city
        const { lat, lon } = await getCityCoordinates(city);

        // Step 2: Fetch categories using lat/lon
        const categories = await fetchCategories(city, lat, lon);

        // Check if Blinkit services are not available
        if (categories.message === 'Blinkit services are not available in this area.') {
            return ReS(res, constants.service_unavailable, 'Blinkit services are not available in this area.');
        }

        // Send immediate response to the client
        ReS(res, constants.success_code, 'Worker tasks are running in the background.');

        // Step 3: Run worker tasks in the background (no await)
        for (const category of categories) {
            for (const sub of category.subcategories) {
                // Run worker in the background without waiting for completion
                runWorker(city, category.l0_cat, sub.l1_cat)
                    .then((result) => {
                        logger.info(`Worker task completed for l0_cat: ${category.l0_cat}, l1_cat: ${sub.l1_cat}`);
                    })
                    .catch((error) => {
                        logger.error(`Worker task failed for l0_cat: ${category.l0_cat}, l1_cat: ${sub.l1_cat}, error: ${error}`);
                    });
            }
        }

    } catch (error) {
        logger.error(`Error at fetchProductDetails: ${error}`);
        return ReS(res, constants.server_error_code, 'Failed to start worker tasks', error.message);
    }
};


const fetchAllProductsByCity = async (req, res) => {
    const { city } = req.query;  // Get the city from the request parameters
    let { skip = 0, limit = 100 } = req.query;  // Default pagination parameters


    // Convert skip and limit to integers
    skip = parseInt(skip, 10);
    limit = parseInt(limit, 10);

    if (!city) {
        return ReS(res, constants.bad_request_code, 'City is required');
    }

    try {
        // Query Firestore for products based on city, with pagination and sorting by inventory
        const productsCollection = firestore.collection('products');

        // Apply city filter, sort by inventory in descending order, and implement pagination using skip/limit
        const querySnapshot = await productsCollection
            .where('city', '==', city)
            .orderBy('inventory', 'desc')
            .offset(skip)  // Skip the first 'skip' records
            .limit(limit)  // Limit the number of records returned
            .get();


        if (querySnapshot._size == 0) {
            return ReS(res, constants.resource_not_found, 'No products found for the specified city');
        }

        const products = [];
        querySnapshot.docs.forEach(doc => {
            products.push(doc.data());
        });

        // Send the response back with the fetched product data
        return ReS(res, constants.success_code, 'Fetched product details successfully', {
            products,
            pagination: {
                skip,
                limit,
                total: products.length
            }
        });

    } catch (error) {
        logger.error(`Error at fetchAllProductsByCity: ${error}`);
        return ReS(res, constants.server_error_code, 'Failed to fetch product details', error.message);
    }
};

module.exports = { fetchProductDetails, fetchAllProductsByCity }