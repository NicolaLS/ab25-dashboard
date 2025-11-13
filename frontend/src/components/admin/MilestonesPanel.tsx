import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "../../context/AdminContext";
import { fetchMilestones, createMilestone, updateMilestone } from "../../api/admin";
import type { Milestone, MilestoneInput } from "../../types";
import { formatSats } from "../../utils/format";
import "./MilestonesPanel.css";

export function MilestonesPanel() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MilestoneInput>({
    name: "",
    type: "transactions",
    threshold: 100,
    enabled: true,
  });

  const milestonesQuery = useQuery({
    queryKey: ["admin", "milestones"],
    queryFn: () => fetchMilestones(token!),
    enabled: Boolean(token),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: MilestoneInput) => createMilestone(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "milestones"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MilestoneInput> & { reset_trigger?: boolean } }) =>
      updateMilestone(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "milestones"] });
      setEditingId(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "transactions",
      threshold: 100,
      enabled: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setFormData({
      name: milestone.name,
      type: milestone.type,
      threshold: milestone.threshold,
      enabled: milestone.enabled,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleResetTrigger = (id: number) => {
    if (confirm("Are you sure you want to reset this milestone trigger? It will trigger again when the threshold is reached.")) {
      updateMutation.mutate({
        id,
        data: { reset_trigger: true },
      });
    }
  };

  if (milestonesQuery.isLoading) {
    return (
      <div className="admin-panel">
        <div className="loading-state">Loading milestones...</div>
      </div>
    );
  }

  if (milestonesQuery.isError) {
    return (
      <div className="admin-panel">
        <div className="error-banner">
          Failed to load milestones: {(milestonesQuery.error as Error).message}
        </div>
      </div>
    );
  }

  const milestones = milestonesQuery.data || [];

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h2>Milestones ({milestones.length})</h2>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Milestone"}
        </button>
      </div>

      <div className="panel-body">
        {showForm && (
          <form onSubmit={handleSubmit} className="milestone-form">
            <h3>{editingId ? "Edit Milestone" : "Add New Milestone"}</h3>

            {(createMutation.isError || updateMutation.isError) && (
              <div className="error-banner">
                {(createMutation.error || updateMutation.error)?.message}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="milestone-name">Name *</label>
                <input
                  id="milestone-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 100 Transactions"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="milestone-type">Type *</label>
                <select
                  id="milestone-type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as "transactions" | "volume" })
                  }
                  required
                >
                  <option value="transactions">Transactions</option>
                  <option value="volume">Volume (Sats)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="milestone-threshold">
                Threshold * {formData.type === "volume" && "(in sats)"}
              </label>
              <input
                id="milestone-threshold"
                type="number"
                min="1"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value, 10) })}
                placeholder={formData.type === "transactions" ? "e.g., 100" : "e.g., 1000000"}
                required
              />
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <span>Enabled (will trigger when threshold is reached)</span>
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
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

        {milestones.length === 0 ? (
          <div className="empty-state">
            <p>No milestones configured yet.</p>
            <p>Click "Add Milestone" to create celebration milestones.</p>
          </div>
        ) : (
          <div className="milestones-grid">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="milestone-card">
                <div className="milestone-card-header">
                  <h4>{milestone.name}</h4>
                  <span className={`status-badge ${milestone.enabled ? "enabled" : "disabled"}`}>
                    {milestone.enabled ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="milestone-card-body">
                  <div className="milestone-detail">
                    <span className="label">Type:</span>
                    <span className="value">{milestone.type === "transactions" ? "Transactions" : "Volume"}</span>
                  </div>

                  <div className="milestone-detail">
                    <span className="label">Threshold:</span>
                    <span className="value">
                      {milestone.type === "transactions"
                        ? milestone.threshold.toLocaleString()
                        : formatSats(milestone.threshold)}
                    </span>
                  </div>

                  <div className="milestone-detail">
                    <span className="label">Status:</span>
                    <span className={`value ${milestone.triggered_at ? "triggered" : "pending"}`}>
                      {milestone.triggered_at
                        ? `Triggered ${new Date(milestone.triggered_at).toLocaleString()}`
                        : "Not triggered yet"}
                    </span>
                  </div>
                </div>

                <div className="milestone-card-actions">
                  <button className="btn-small btn-primary" onClick={() => handleEdit(milestone)} disabled={showForm}>
                    Edit
                  </button>
                  {milestone.triggered_at && (
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleResetTrigger(milestone.id)}
                      disabled={updateMutation.isPending}
                    >
                      Reset Trigger
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
