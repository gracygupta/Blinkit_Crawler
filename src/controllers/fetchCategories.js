const { Worker } = require('worker_threads');
const path = require('path');
const logger = require('../config/logger');
require('dotenv').config();
const { firestore } = require('../config/firebase.config');

// Fetch categories using fetch with lat and lon headers
async function fetchCategories(city, lat, lon) {
    try {
        const url = `https://blinkit.com/v2/search/deeplink/?expr=%22ch1383%22&restricted=false&version=8`;

        // Example headers for latitude, longitude, and cookie
        const myHeaders = new Headers();
        myHeaders.append("lat", lat);
        myHeaders.append("lon", lon);
        myHeaders.append("Cookie", "__cf_bm=O7lwGu3frqTVqH23c4nEzl1mReux.7m.l3piNgc8M5A-1728243052-1.0.1.1-AsCs8N49D7QNO8hXiMenkJW0rXWcSzpwWODYfPjjZFLYIUVe_2krxBfFUjqOEq5QZooPa9d_e3NOL5W_oaZIYg; __cfruid=f18d02be2bb0e8c713b102b3151230fa68e953fa-1728214531; _cfuvid=V2mIvCczA9b7dRoGHPJ.Z98FvMjdq6ZOvYxEXnz6o_8-1728214531651-0.0.1.1-604800000; gr_1_deviceId=c50e20a7-00e2-4ce7-af37-057b218e29b1");

        console.log("headers", myHeaders);

        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        // Await the fetch response
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Convert the response to JSON format
        const data = await response.json();

        // Check if Blinkit services are unavailable
        if (data?.data?.merchant?.id === -1) {
            logger.warn('Blinkit services are not available for this location.');
            return { message: 'Blinkit services are not available in this area.' };
        }

        const categories = data.data.merchant.categories; // Assuming this structure based on the earlier example

        const reqData = categories.map(category => ({
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
            const docRef = categoryCollection.doc(city + category.l0_cat.toString());
            await docRef.set(category);
        }

        logger.info('Categories stored in Firestore successfully.');
        return reqData;

    } catch (error) {
        console.log(error)
        logger.error('Error fetching categories:', error);
        throw error;
    }
}


// Function to run worker thread for each category
function runWorker(l0_cat, l1_cat) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, 'worker.js'), {
            workerData: { l0_cat, l1_cat }
        });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

module.exports = { fetchCategories, runWorker };
