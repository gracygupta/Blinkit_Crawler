const axios = require('axios');

const ReS = (res, status, message, data) => {
    const res_obj = {
        'status': status,
        'message': message,
        'data': data
    };
    res.status(status).json(res_obj);
};


// Geocode the city to get lat/lon using OpenStreetMap Nominatim API
async function getCityCoordinates(city) {
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q: city,
                format: 'json',
                limit: 1
            }
        });

        if (response.data.length === 0) {
            throw new Error(`City not found: ${city}`);
        }

        const location = response.data[0];
        return { lat: location.lat, lon: location.lon };
    } catch (error) {
        throw new Error('Error fetching city coordinates: ' + error.message);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    ReS,
    getCityCoordinates,
    delay
};