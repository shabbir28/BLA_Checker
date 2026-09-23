import { Router } from 'express';
import {
  getDashboardAnalytics,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getApiConfig,
  updateApiConfig,
  testApiConnection,
  getAuditLogs,
} from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Apply Auth and Admin checks to all admin endpoints
router.use(requireAuth, requireAdmin);

router.get('/analytics', getDashboardAnalytics);
router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/api-config', getApiConfig);
router.put('/api-config', updateApiConfig);
router.post('/test-connection', testApiConnection);

router.get('/audit-logs', getAuditLogs);

export default router;
