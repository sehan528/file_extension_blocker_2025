const helmet = require('helmet');

module.exports = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://code.jquery.com"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"]
        }
    }
});