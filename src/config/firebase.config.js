const admin = require('firebase-admin');
const path = require('path');
const logger = require('../config/logger');

// Initialize Firebase Admin SDK with your service account
const serviceAccount = require(path.resolve(__dirname, '../../firebase-service-account.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

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

module.exports = { firestore, storeProductsInFirestore };