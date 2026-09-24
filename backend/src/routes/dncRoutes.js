import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  uploadMasterDnc,
  listMasterDnc,
  addSingleDnc,
  deleteDnc,
  getDncStats,
  exportMasterDnc,
} from '../controllers/dncController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { UPLOADS_DIR } from '../config/uploads.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'dnc-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      const err = new Error('Only CSV, XLSX, XLS, and TXT files are supported.');
      err.status = 400;
      cb(err);
    }
  },
});

const router = Router();

// Master DNC routes (Admin and authenticated users can view, Admin can upload/delete)
router.get('/stats', requireAuth, getDncStats);
router.get('/list', requireAuth, listMasterDnc);
router.get('/export', requireAuth, exportMasterDnc);
router.post('/single', requireAuth, requireAdmin, addSingleDnc);
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), uploadMasterDnc);
router.delete('/:id', requireAuth, requireAdmin, deleteDnc);

export default router;
