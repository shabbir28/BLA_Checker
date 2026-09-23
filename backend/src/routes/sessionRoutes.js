import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  previewLeadFile,
  startLeadSession,
  listSessions,
  getSession,
  getSessionRecords,
  exportSessionClean,
  exportSessionFull,
  deleteSession,
} from '../controllers/sessionController.js';
import { requireAuth } from '../middleware/auth.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'lead-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, XLSX, XLS, and TXT lead files are supported.'));
    }
  },
});

const router = Router();

router.use(requireAuth);

router.post('/preview', upload.single('file'), previewLeadFile);
router.post('/start', startLeadSession);
router.get('/list', listSessions);
router.get('/:id', getSession);
router.get('/:id/records', getSessionRecords);
router.get('/:id/export/clean', exportSessionClean);
router.get('/:id/export/full', exportSessionFull);
router.delete('/:id', deleteSession);

export default router;
