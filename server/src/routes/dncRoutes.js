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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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
      cb(new Error('Only CSV, XLSX, XLS, and TXT files are supported.'));
    }
  },
});

const router = Router();

// Master DNC routes (Admin and authenticated users can view, Admin can upload/delete)
router.get('/stats', requireAuth, getDncStats);
router.get('/list', requireAuth, listMasterDnc);
router.get('/export', requireAuth, exportMasterDnc);
router.post('/single', requireAuth, addSingleDnc);
router.post('/upload', requireAuth, upload.single('file'), uploadMasterDnc);
router.delete('/:id', requireAuth, requireAdmin, deleteDnc);

export default router;
