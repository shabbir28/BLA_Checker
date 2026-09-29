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
import {
  getSecurityState,
  addAllowedIp,
  updateAllowedIp,
  removeAllowedIp,
  updateSecuritySettings,
} from '../controllers/securityController.js';
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

router.get('/security', getSecurityState);
router.put('/security', updateSecuritySettings);
router.post('/security/ips', addAllowedIp);
router.patch('/security/ips/:id', updateAllowedIp);
router.delete('/security/ips/:id', removeAllowedIp);

export default router;
