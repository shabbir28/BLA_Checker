import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { formatDateTime } from '../../utils/format';
import {
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  MapPin,
  Globe,
} from 'lucide-react';

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
        checked ? 'bg-emerald-500' : 'bg-zinc-700'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function SecurityView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState(null);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [ipInput, setIpInput] = useState('');
  const [description, setDescription] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      setError(null);
      const res = await adminApi.getSecurity();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load security settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setIpInput('');
    setDescription('');
    setFormStatus('active');
    setFormError(null);
    setModalOpen(true);
  };

  const applyProtection = async (next) => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateSecurity({ enabled: next });
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update protection.');
      setConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    if (!data || saving) return;
    if (data.enabled) {
      applyProtection(false);
      return;
    }
    setError(null);
    setConfirm({ type: 'enable' });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      setFormError(null);
      await adminApi.addAllowedIp({
        ip_address: ipInput.trim(),
        description: description.trim(),
        status: formStatus,
      });
      setModalOpen(false);
      setIpInput('');
      setDescription('');
      setFormStatus('active');
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not allow this IP.');
    } finally {
      setAdding(false);
    }
  };

  const handleStatus = async (row) => {
    const next = row.status === 'active' ? 'inactive' : 'active';
    try {
      setStatusBusyId(row.id);
      setError(null);
      await adminApi.updateAllowedIp(row.id, { status: next });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update IP status.');
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleRemove = (row) => {
    setError(null);
    setConfirm({ type: 'remove', row });
  };

  const applyRemove = async (row) => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.removeAllowedIp(row.id);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove this IP.');
      setConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading security…" size="lg" />;

  const enabled = Boolean(data?.enabled);
  const ips = data?.allowedIps || [];
  const activeCount = ips.filter((row) => row.status === 'active').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">Administration</span>
          <h2 className="page-title mt-1">Security</h2>
          <p className="page-subtitle">
            Administrators only. Allowed IPs can open the server; everyone else sees 404 Not Found.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-icon" title="Refresh" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={openAddModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add IP
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error" role="alert">
          <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <section className={`card p-5 ${enabled ? 'border-emerald-800/50' : ''}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                enabled ? 'bg-emerald-500 text-black' : 'bg-surface-raised text-zinc-400 ring-1 ring-surface-border'
              }`}
            >
              {enabled ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-white">IP protection</h3>
                <span className={enabled ? 'chip-emerald' : 'chip-zinc'}>{enabled ? 'Active' : 'Off'}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {enabled
                  ? `${activeCount} active ${activeCount === 1 ? 'IP' : 'IPs'}. Off or unlisted visitors get 404.`
                  : 'Server is open until you add IPs and turn this on.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle IP protection"
            onClick={handleToggle}
            disabled={saving}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
              enabled ? 'bg-emerald-500' : 'bg-zinc-700'
            } ${saving ? 'opacity-60' : ''}`}
          >
            <span
              className={`absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" /> : null}
            </span>
          </button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div>
            <h3 className="section-title">Allowed IP list</h3>
            <p className="section-subtitle">Turn a row Off to block that IP without deleting it.</p>
          </div>
          <span className="font-mono text-xs text-zinc-500">
            {activeCount}/{ips.length} on
          </span>
        </div>

        {ips.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No allowed IPs yet"
            description="Add an IP and a description of where it is used, then turn protection on."
            actionLabel="Add IP"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>IP address</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Added by</th>
                  <th>Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ips.map((row) => {
                  const isOn = row.status === 'active';
                  return (
                    <tr key={row.id} className={isOn ? '' : 'opacity-70'}>
                      <td className="font-mono font-semibold text-white">{row.ip_address}</td>
                      <td>
                        <span className="inline-flex items-start gap-1.5 text-sm text-zinc-200">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          {row.label || '—'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Toggle
                            checked={isOn}
                            disabled={statusBusyId === row.id}
                            label={`${isOn ? 'Turn off' : 'Turn on'} ${row.ip_address}`}
                            onChange={() => handleStatus(row)}
                          />
                          <StatusBadge status={isOn ? 'ON' : 'OFF'} size="xs" />
                        </div>
                      </td>
                      <td className="text-xs text-zinc-400">{row.created_by_name || row.created_by_email || '—'}</td>
                      <td className="whitespace-nowrap text-xs text-zinc-500">{formatDateTime(row.created_at)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(row)}
                          className="btn-icon hover:!border-red-900/60 hover:!text-red-400"
                          title="Remove"
                          aria-label={`Remove ${row.ip_address}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add allowed IP"
        description="Write where this IP is from so the list stays clear later."
        size="sm"
      >
        <form onSubmit={handleAdd} className="space-y-5">
          <div>
            <label htmlFor="sec-ip" className="label">IP address</label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="sec-ip"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="203.215.160.40"
                className="input input-with-icon font-mono"
                required
                autoFocus
              />
            </div>
          </div>
          <div>
            <label htmlFor="sec-desc" className="label">Description — where is this IP?</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="sec-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Office Karachi, Home, VPN"
                className="input input-with-icon"
                required
                maxLength={255}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised/50 px-3.5 py-3">
            <div>
              <p className="text-sm font-medium text-white">Status</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {formStatus === 'active' ? 'This IP can access the server when protection is on.' : 'Saved as Off — it will not have access until you turn it On.'}
              </p>
            </div>
            <Toggle
              checked={formStatus === 'active'}
              label="IP status"
              onChange={() => setFormStatus((v) => (v === 'active' ? 'inactive' : 'active'))}
            />
          </div>

          {formError && (
            <div className="alert-error" role="alert">
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={adding || !ipInput.trim() || !description.trim()} className="btn-primary">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Allow IP
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(confirm)}
        onClose={() => !saving && setConfirm(null)}
        title={confirm?.type === 'remove' ? 'Remove this IP?' : 'Turn on IP protection?'}
        description={
          confirm?.type === 'remove'
            ? 'This address will be deleted from the allowed list.'
            : 'Only IPs marked On will be able to open the server.'
        }
        size="sm"
      >
        {confirm?.type === 'enable' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-3.5 py-3 text-xs text-amber-100">
              Addresses that are Off or not on this list will see <span className="font-semibold">404 Not Found</span>.
              Make sure your current IP is On before you continue.
            </div>
            <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
              <button type="button" onClick={() => setConfirm(null)} disabled={saving} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={() => applyProtection(true)} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Turn on protection
              </button>
            </div>
          </div>
        )}
        {confirm?.type === 'remove' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Remove <span className="font-mono font-semibold text-white">{confirm.row?.ip_address}</span>
              {confirm.row?.label ? (
                <span className="text-zinc-500"> ({confirm.row.label})</span>
              ) : null}
              ?
            </p>
            <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
              <button type="button" onClick={() => setConfirm(null)} disabled={saving} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={() => applyRemove(confirm.row)} disabled={saving} className="btn-danger">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove IP
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SecurityView;
