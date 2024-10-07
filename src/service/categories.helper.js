const { Worker } = require('worker_threads');
const path = require('path');
require('dotenv').config();
const logger = require('../config/logger');
const { firestore } = require('../config/firebase.config');
const { delay } = require('./general.helper');

// Fetch categories using fetch with lat and lon headers
async function fetchCategories(city, lat, lon, retryCount = 0) {
    try {
        const maxRetries = 5;
        const baseDelay = 2000; // Base delay in milliseconds

        const url = `https://blinkit.com/v2/search/deeplink/?expr=%22ch1383%22&restricted=false&version=8`;

        // Example headers for latitude, longitude, and cookie
        const myHeaders = new Headers();
        myHeaders.append("lat", lat);
        myHeaders.append("lon", lon);
        myHeaders.append("Cookie", process.env.COOKIE);

        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        // Await the fetch response
        const response = await fetch(url, requestOptions);


        if (response.status === 429) {
            if (retryCount < maxRetries) {
                const retryAfter = response.headers.get('Retry-After');
                const delayTime = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, retryCount); // Exponential backoff

                logger.warn(`Rate limit hit, retrying in ${delayTime / 1000} seconds...`);
                await delay(delayTime);  // Delay before retrying
                return fetchCategories(city, lat, lon, retryCount + 1)  // Retry
            } else {
                throw new Error('Max retry attempts reached for rate limiting.');
            }
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Convert the response to JSON format
        const data = await response.json();

        // Check if Blinkit services are unavailable
        if (data?.data?.merchant?.id === -1) {
            return { message: 'Blinkit services are not available in this area.' };
        }

        const categories = data.data.merchant.categories;

        const reqData = categories.map(category => ({
            city: city,
            name: category.name,
            l0_cat: category.id, // Top-level category ID
            subcategories: category.subcategories.map(sub => ({
                l1_cat: sub.id, // Subcategory ID
                name: sub.name  // Subcategory name
            }))
        }));

        // Step 3: Store categories in Firestore
        const categoryCollection = firestore.collection('categories');

        for (const category of reqData) {
            const docRef = categoryCollection.doc(category.l0_cat.toString());
            await docRef.set(category);
        }

        logger.info('Categories stored in Firestore successfully.');
        return reqData;

    } catch (error) {
        logger.error('Error fetching categories:', error);
        throw error;
    }
}


// Function to run worker thread for each category
function runWorker(city, l0_cat, l1_cat) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, 'worker.js'), {
            workerData: { city, l0_cat, l1_cat }
        });


        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

module.exports = { fetchCategories, runWorker };
