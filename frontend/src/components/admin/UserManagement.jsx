import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import { formatNumber } from '../../utils/format';
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

const EMPTY_CREATE = { name: '', email: '', password: '', role: 'user' };

const ROLE_HINTS = {
  user: 'Can upload files, check numbers and download clean lists.',
  admin: 'Full access: dashboard, all sessions, DNC upload and user management.',
};

function FormError({ msg }) {
  if (!msg) return null;
  return (
    <div className="alert-error" role="alert">
      <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
      <span>{msg}</span>
    </div>
  );
}

function IconInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input {...props} className={`input input-with-icon ${className}`} />
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, required, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={6}
        autoComplete={autoComplete}
        className="input input-with-icon pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 transition hover:bg-surface-hover hover:text-zinc-200"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function RoleSelect({ id, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="label">Role</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="select">
        <option value="user">User</option>
        <option value="admin">Administrator</option>
      </select>
      <p className="mt-1.5 text-[11px] text-zinc-600">{ROLE_HINTS[value]}</p>
    </div>
  );
}

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [editForm, setEditForm] = useState({ name: '', role: 'user', status: 'active', newPassword: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const fetchUsers = async (targetPage = page, targetSearch = search) => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({ page: targetPage, limit: 20, search: targetSearch });
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

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchUsers(newPage, search);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await adminApi.createUser(createForm);
      setIsCreateModalOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchUsers(1, search);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setEditForm({ name: u.name, role: u.role, status: u.status, newPassword: '' });
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
    if (id === currentUser.id) return;
    if (!window.confirm(`Delete user "${email}"? Their sessions will be kept but unassigned.`)) return;
    try {
      await adminApi.deleteUser(id);
      fetchUsers(page, search);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">Administration</span>
          <h2 className="page-title mt-1">Users</h2>
          <p className="page-subtitle">Manage accounts, roles and access.</p>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="btn-primary"
        >
          <UserPlus className="h-4 w-4" /> Add user
        </button>
      </div>

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="px-1 text-xs text-zinc-400">
          <span className="font-mono font-semibold text-white">{formatNumber(pagination.total)}</span> total users
        </span>
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email… (Enter)"
            className="input input-with-icon py-2"
          />
        </form>
      </div>

      <section className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading users…" />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try a different search or add a new user." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Files</th>
                    <th className="text-right">Numbers checked</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white ring-1 ring-white/10">
                              {initialsOf(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {u.name}
                                {isSelf && <span className="ml-2 text-[10px] font-normal text-zinc-500">(you)</span>}
                              </p>
                              <p className="truncate font-mono text-[11px] text-zinc-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={u.role} size="xs" />
                        </td>
                        <td>
                          <StatusBadge status={u.status} size="xs" />
                        </td>
                        <td className="text-right font-mono text-zinc-300">{formatNumber(u.sessions_count)}</td>
                        <td className="text-right font-mono font-semibold text-emerald-300">{formatNumber(u.total_leads_scrubbed)}</td>
                        <td className="whitespace-nowrap text-xs text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleOpenEdit(u)} className="btn-icon" title="Edit user" aria-label="Edit user">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="btn-icon hover:!border-red-900/60 hover:!text-red-400"
                                title="Delete user"
                                aria-label="Delete user"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-xs text-zinc-400">
                <span>
                  Page <span className="font-mono text-zinc-200">{page}</span> of <span className="font-mono text-zinc-200">{pagination.totalPages}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="btn-icon" aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => handlePageChange(page + 1)} disabled={page >= pagination.totalPages} className="btn-icon" aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Create */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add new user"
        description="The user can sign in immediately with these credentials."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="label">Full name</label>
              <IconInput
                id="c-name"
                icon={User}
                type="text"
                autoComplete="off"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="c-email" className="label">Email address</label>
              <IconInput
                id="c-email"
                icon={Mail}
                type="email"
                autoComplete="off"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="jane@company.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-password" className="label">Password</label>
              <PasswordInput
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">The user can change this later.</p>
            </div>
            <RoleSelect id="c-role" value={createForm.role} onChange={(role) => setCreateForm({ ...createForm, role })} />
          </div>

          <FormError msg={createError} />

          <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={createSubmitting} className="btn-primary">
              {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit user" description={selectedUser?.email}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label htmlFor="e-name" className="label">Full name</label>
            <IconInput
              id="e-name"
              icon={User}
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleSelect id="e-role" value={editForm.role} onChange={(role) => setEditForm({ ...editForm, role })} />
            <div>
              <label htmlFor="e-status" className="label">Status</label>
              <select id="e-status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="select">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="e-password" className="label">
              Reset password <span className="text-zinc-600">(optional)</span>
            </label>
            <PasswordInput
              value={editForm.newPassword}
              onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
            />
          </div>

          <FormError msg={editError} />

          <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={editSubmitting} className="btn-primary">
              {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UserManagement;
