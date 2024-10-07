const { ReS, getCityCoordinates } = require('../service/general.helper');
const constants = require('../config/constants');
const logger = require('../config/logger');
const { fetchCategories, runWorker } = require('../service/categories.helper');


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

        // Step 3: Fetch product details for each category using worker threads
        const categoryPromises = categories.flatMap(category =>
            category.subcategories.map(sub =>
                runWorker(city, category.l0_cat, sub.l1_cat) // Ensure runWorker is returned properly
            )
        );

        // Wait for all workers to complete
        const products = await Promise.all(categoryPromises);

        // Step 4: Send the response back with the fetched product data
        return ReS(res, constants.success_code, 'Fetched product details successfully')

    } catch (error) {
        logger.error(`Error at fetchProductDetails: ${error}`)
        return ReS(res, constants.server_error_code, 'Failed to fetch product details', error.message)
    }
}

module.exports = { fetchProductDetails }