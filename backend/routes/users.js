const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authMiddleware, companyAdminOrAbove } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/errorHandler');
const { userValidation } = require('../utils/validators');
const userController = require('../controllers/userController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.xlsx$/i.test(file.originalname)
      || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (ok) cb(null, true);
    else cb(new Error('Sube un archivo Excel (.xlsx)'));
  },
});

router.use(authMiddleware);
router.use(companyAdminOrAbove);

router.get('/', userController.list);
router.get('/import/template', userController.downloadImportTemplate);
router.post('/import', upload.single('file'), userController.importExcel);
router.get('/:id', userController.getById);
router.post('/', userValidation.create, validationMiddleware, userController.create);
router.put('/:id', userValidation.update, validationMiddleware, userController.update);
router.put('/:id/password', userValidation.changePassword, validationMiddleware, userController.changePassword);
router.delete('/:id', userController.remove);

module.exports = router;
