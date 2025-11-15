import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "../../context/AdminContext";
import { fetchScenesAdmin, createScene, updateScene, deleteScene } from "../../api/admin";
import type { Scene, SceneInput } from "../../types";
import "./ScenesPanel.css";

export function ScenesPanel() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SceneInput>({
    id: "",
    name: "",
    duration: 10000,
    enabled: true,
    order: 1,
  });

  const scenesQuery = useQuery({
    queryKey: ["admin", "scenes"],
    queryFn: () => fetchScenesAdmin(token!),
    enabled: Boolean(token),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: SceneInput) => createScene(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "scenes"] });
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SceneInput> }) =>
      updateScene(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "scenes"] });
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScene(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "scenes"] });
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      duration: 10000,
      enabled: true,
      order: 1,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (scene: Scene) => {
    setEditingId(scene.id);
    setFormData({
      id: scene.id,
      name: scene.name,
      duration: scene.duration,
      enabled: scene.enabled,
      order: scene.order,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name: formData.name,
          duration: formData.duration,
          enabled: formData.enabled,
          order: formData.order,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this scene?")) {
      deleteMutation.mutate(id);
    }
  };

  if (scenesQuery.isLoading) {
    return (
      <div className="admin-panel">
        <div className="loading-state">Loading scenes...</div>
      </div>
    );
  }

  if (scenesQuery.isError) {
    return (
      <div className="admin-panel">
        <div className="error-banner">
          Failed to load scenes: {(scenesQuery.error as Error).message}
        </div>
      </div>
    );
  }

  const scenes = scenesQuery.data || [];

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h2>Scenes ({scenes.length})</h2>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Scene"}
        </button>
      </div>

      <div className="panel-body">
        {showForm && (
          <form onSubmit={handleSubmit} className="scene-form">
            <h3>{editingId ? "Edit Scene" : "Add New Scene"}</h3>

            {(createMutation.isError || updateMutation.isError) && (
              <div className="error-banner">
                {(createMutation.error || updateMutation.error)?.message}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scene-id">ID *</label>
                <input
                  id="scene-id"
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., overview"
                  required
                  disabled={Boolean(editingId)}
                />
                <small>Unique identifier (cannot be changed after creation)</small>
              </div>

              <div className="form-group">
                <label htmlFor="scene-name">Name *</label>
                <input
                  id="scene-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Overview"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scene-duration">Duration (ms) *</label>
                <input
                  id="scene-duration"
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) })}
                  placeholder="e.g., 10000"
                  required
                />
                <small>Duration in milliseconds (1000ms = 1 second)</small>
              </div>

              <div className="form-group">
                <label htmlFor="scene-order">Order *</label>
                <input
                  id="scene-order"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) })}
                  placeholder="e.g., 1"
                  required
                />
                <small>Display order (lower numbers appear first)</small>
              </div>
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <span>Enabled (scene will appear in rotation)</span>
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

        {scenes.length === 0 ? (
          <div className="empty-state">
            <p>No scenes configured yet.</p>
            <p>Click "Add Scene" to create a new scene.</p>
          </div>
        ) : (
          <div className="scenes-grid">
            {scenes.map((scene) => (
              <div key={scene.id} className="scene-card">
                <div className="scene-card-header">
                  <h4>{scene.name}</h4>
                  <span className={`status-badge ${scene.enabled ? "enabled" : "disabled"}`}>
                    {scene.enabled ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="scene-card-body">
                  <div className="scene-detail">
                    <span className="label">ID:</span>
                    <span className="value">{scene.id}</span>
                  </div>

                  <div className="scene-detail">
                    <span className="label">Duration:</span>
                    <span className="value">{(scene.duration / 1000).toFixed(1)}s</span>
                  </div>

                  <div className="scene-detail">
                    <span className="label">Order:</span>
                    <span className="value">#{scene.order}</span>
                  </div>
                </div>

                <div className="scene-card-actions">
                  <button className="btn-small btn-primary" onClick={() => handleEdit(scene)} disabled={showForm}>
                    Edit
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleDelete(scene.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
