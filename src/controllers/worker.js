const { workerData, parentPort } = require('worker_threads');
const { firestore } = require('../config/firebase.config');
const logger = require('../config/logger');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch product details for a category with exponential backoff
async function fetchProductDetails(l0_cat, l1_cat, retryCount = 0) {
    const maxRetries = 5;
    const baseDelay = 2000; // Base delay in milliseconds

    try {
        const url = `https://blinkit.com/v2/listing?l0_cat=${l0_cat}&l1_cat=${l1_cat}`;

        const myHeaders = new Headers();
        myHeaders.append("lat", "28.667856");
        myHeaders.append("lon", "77.449791");
        myHeaders.append("Cookie", '__cf_bm=eFdeUujE68QM_4DmOH1qbjQcXyKxlgFXtRnMIHwuUGo-1728234387-1.0.1.1-kmFZ.a14uEHUqk.FgRBFR3ONyntaq3i5Elc26I.Djzopi0UEwVdOisNCdi6npBQ5PkCypwLX9zUADXcXnY6YNA; __cfruid=f18d02be2bb0e8c713b102b3151230fa68e953fa-1728214531; _cfuvid=V2mIvCczA9b7dRoGHPJ.Z98FvMjdq6ZOvYxEXnz6o_8-1728214531651-0.0.1.1-604800000');

        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        const response = await fetch(url, requestOptions);

        if (response.status === 429) {
            if (retryCount < maxRetries) {
                const retryAfter = response.headers.get('Retry-After');
                const delayTime = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, retryCount); // Exponential backoff

                console.log(`Rate limit hit, retrying in ${delayTime / 1000} seconds...`);
                await delay(delayTime);  // Delay before retrying
                return fetchProductDetails(l0_cat, l1_cat, retryCount + 1);  // Retry
            } else {
                throw new Error('Max retry attempts reached for rate limiting.');
            }
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the response
        const result = await response.json();

        const dynamicKey = `/v1/listing/widgets?l0_cat=${l0_cat}&l1_cat=${l1_cat}`;
        let products = result.prefetch?.with_data?.[dynamicKey];

        // Filter out required fields and flatten the arrays
        const productDetails = products?.objects?.flatMap(product => {
            return product.objects?.map(subProduct => ({
                product_id: subProduct.data?.product?.product_id,
                name: subProduct.tracking.widget_meta?.title,
                merchant: {
                    name: subProduct.data?.merchant?.name,
                    min_order: subProduct.data?.merchant?.min_order,
                },
                price: subProduct.tracking.widget_meta?.custom_data?.price,
                mrp: subProduct.tracking.widget_meta?.custom_data?.mrp,
                unit: subProduct.data?.product?.unit,
                inventory: subProduct.tracking.widget_meta?.custom_data?.inventory,
                images: subProduct.data?.product?.images || [],
                offer: subProduct.data?.product?.offer || '',
                discount: subProduct.data?.product?.discount || 0,
                type: subProduct.data?.product?.type,
                l0_cat,  // Storing l0_cat and l1_cat in the product object
                l1_cat
            })) || [];
        }) || [];

        // Store products in Firestore
        await storeProductsInFirestore(productDetails);

        return productDetails;
    } catch (error) {
        logger.error(`Error fetching product details for l0_cat ${l0_cat} and l1_cat ${l1_cat}:`, error);
        throw error;
    }
}

// Function to store products in Firestore
async function storeProductsInFirestore(products) {
    try {
        const batch = firestore.batch();
        products.forEach((product) => {
            const productRef = firestore.collection('products').doc(product.product_id.toString());
            batch.set(productRef, product);
        });

        await batch.commit();
    } catch (error) {
        logger.error('Error storing products in Firestore:', error);
    }
}

// Main worker function
(async () => {
    const { l0_cat, l1_cat } = workerData;

    try {
        const productDetails = await fetchProductDetails(l0_cat, l1_cat);
        parentPort.postMessage({ l0_cat, l1_cat, products: productDetails });
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
})();
