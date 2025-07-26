const cors = require('cors');

module.exports = cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGINS?.split(',')
        : true,
    credentials: true
});