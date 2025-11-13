import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "../../context/AdminContext";
import { fetchMerchants, createMerchant, updateMerchant, refetchMerchant } from "../../api/admin";
import type { Merchant, MerchantInput } from "../../types";
import "./MerchantsPanel.css";

export function MerchantsPanel() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MerchantInput>({
    id: "",
    public_key: "",
    alias: "",
    enabled: true,
  });

  const merchantsQuery = useQuery({
    queryKey: ["admin", "merchants"],
    queryFn: () => fetchMerchants(token!),
    enabled: Boolean(token),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: MerchantInput) => createMerchant(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MerchantInput> }) =>
      updateMerchant(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
      setEditingId(null);
      resetForm();
    },
  });

  const refetchMutation = useMutation({
    mutationFn: (id: string) => refetchMerchant(token!, id),
  });

  const resetForm = () => {
    setFormData({ id: "", public_key: "", alias: "", enabled: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingId(merchant.id);
    setFormData({
      id: merchant.id,
      public_key: merchant.public_key,
      alias: merchant.alias,
      enabled: merchant.enabled,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          alias: formData.alias,
          enabled: formData.enabled,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleRefetch = (id: string) => {
    refetchMutation.mutate(id);
  };

  if (merchantsQuery.isLoading) {
    return (
      <div className="admin-panel">
        <div className="loading-state">Loading merchants...</div>
      </div>
    );
  }

  if (merchantsQuery.isError) {
    return (
      <div className="admin-panel">
        <div className="error-banner">
          Failed to load merchants: {(merchantsQuery.error as Error).message}
        </div>
      </div>
    );
  }

  const merchants = merchantsQuery.data || [];

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h2>Merchants ({merchants.length})</h2>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Merchant"}
        </button>
      </div>

      <div className="panel-body">
        {showForm && (
          <form onSubmit={handleSubmit} className="merchant-form">
            <h3>{editingId ? "Edit Merchant" : "Add New Merchant"}</h3>

            {(createMutation.isError || updateMutation.isError) && (
              <div className="error-banner">
                {(createMutation.error || updateMutation.error)?.message}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="merchant-id">Merchant ID *</label>
                <input
                  id="merchant-id"
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., 100"
                  required
                  disabled={Boolean(editingId)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="alias">Alias *</label>
                <input
                  id="alias"
                  type="text"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="e.g., Bitcoin Coffee"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="public-key">Public Key *</label>
              <input
                id="public-key"
                type="text"
                value={formData.public_key}
                onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
                placeholder="Enter merchant public key"
                required
                disabled={Boolean(editingId)}
              />
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <span>Enabled (actively polling)</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingId
                    ? "Update"
                    : "Create"}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}

        {merchants.length === 0 ? (
          <div className="empty-state">
            <p>No merchants configured yet.</p>
            <p>Click "Add Merchant" to get started.</p>
          </div>
        ) : (
          <div className="merchants-table-wrapper">
            <table className="merchants-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Alias</th>
                  <th>Public Key</th>
                  <th>Status</th>
                  <th>Last Polled</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant) => (
                  <tr key={merchant.id}>
                    <td>
                      <code>{merchant.id}</code>
                    </td>
                    <td>
                      <strong>{merchant.alias}</strong>
                    </td>
                    <td>
                      <code className="truncate">{merchant.public_key}</code>
                    </td>
                    <td>
                      <span className={`status-badge ${merchant.enabled ? "enabled" : "disabled"}`}>
                        {merchant.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td>{merchant.last_polled_at ? new Date(merchant.last_polled_at).toLocaleString() : "Never"}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-small btn-primary"
                          onClick={() => handleEdit(merchant)}
                          disabled={showForm}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-small btn-success"
                          onClick={() => handleRefetch(merchant.id)}
                          disabled={refetchMutation.isPending}
                        >
                          {refetchMutation.isPending ? "..." : "Refetch"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
