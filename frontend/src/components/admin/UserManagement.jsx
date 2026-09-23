import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Shield,
  Key,
} from 'lucide-react';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    lead_quota: 250000,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'user',
    status: 'active',
    lead_quota: 250000,
    newPassword: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const fetchUsers = async (targetPage = page, targetSearch = search) => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({
        page: targetPage,
        limit: 20,
        search: targetSearch,
      });
      setUsers(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('[ADMIN] Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, '');
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await adminApi.createUser(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'user', lead_quota: 250000 });
      fetchUsers(1, search);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      role: user.role,
      status: user.status,
      lead_quota: user.lead_quota,
      newPassword: '',
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setEditSubmitting(true);
      setEditError(null);
      await adminApi.updateUser(selectedUser.id, editForm);
      setIsEditModalOpen(false);
      fetchUsers(page, search);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (id === currentUser.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Permanently remove user "${email}"?`)) return;
    try {
      await adminApi.deleteUser(id);
      fetchUsers(page, search);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900/90 to-brand-950/20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            User & Access Management
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Provision staff accounts, configure lead quotas, assign administrator privileges, or revoke access.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-brand-500/25 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Search Header */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Total Users ({pagination.total || 0})
        </span>

        <form onSubmit={handleSearchSubmit} className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading user directory..." />
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="py-3 pl-4">User</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Lead Quota</th>
                  <th className="py-3 text-right">Sessions Run</th>
                  <th className="py-3 text-right">Total Leads Scrubbed</th>
                  <th className="py-3">Created</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 pl-4 font-sans">
                      <div className="font-semibold text-slate-200">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 font-sans">
                      <StatusBadge status={u.role} size="xs" />
                    </td>
                    <td className="py-3 font-sans">
                      <StatusBadge status={u.status} size="xs" />
                    </td>
                    <td className="py-3 text-right text-slate-300">
                      {parseInt(u.lead_quota || 0, 10).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-300">
                      {parseInt(u.sessions_count || 0, 10).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-bold">
                      {parseInt(u.total_leads_scrubbed || 0, 10).toLocaleString()}
                    </td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 font-sans">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No users found.</p>
          </div>
        )}
      </div>

      {/* MODAL: CREATE USER */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New Staff User"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Jane Doe"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="jane.doe@company.com"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="Min 6 characters"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Access Role
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="user">User (Lead Scrubbing Only)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Lead Quota
              </label>
              <input
                type="number"
                value={createForm.lead_quota}
                onChange={(e) => setCreateForm({ ...createForm, lead_quota: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
            >
              {createSubmitting ? 'Provisioning...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT USER */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.email}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Lead Quota
            </label>
            <input
              type="number"
              value={editForm.lead_quota}
              onChange={(e) => setEditForm({ ...editForm, lead_quota: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              value={editForm.newPassword}
              onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              placeholder="Leave blank to keep existing password"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {editError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {editError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UserManagement;
