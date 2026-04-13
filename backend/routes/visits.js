const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/errorHandler');
const { visitValidation } = require('../utils/validators');
const visitController = require('../controllers/visitController');

router.use(authMiddleware);

router.get('/', visitValidation.list, validationMiddleware, visitController.list);
router.get('/destinations', visitController.getDestinations);
router.get('/export/csv', visitController.exportCSV);
router.get('/:id', visitController.getById);
router.post('/', visitValidation.create, validationMiddleware, visitController.create);
router.put('/:id', visitValidation.update, validationMiddleware, visitController.update);
router.delete('/:id', visitController.remove);
router.post('/:id/checkin', visitController.checkIn);
router.post('/:id/checkout', visitController.checkOut);

module.exports = router;
