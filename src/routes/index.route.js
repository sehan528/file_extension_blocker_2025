const express = require('express');
const router = express.Router();
const viewController = require('../controllers/view.controller');

router.get('/', viewController.serveHomePage);

module.exports = router;