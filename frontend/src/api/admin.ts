import { API_BASE_URL } from "../config";
import type { Merchant, MerchantInput, Milestone, MilestoneInput, Scene, SceneInput } from "../types";

async function adminRequest<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const base =
    API_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
  const url = new URL(path, base);

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

// Merchants
export function fetchMerchants(token: string) {
  return adminRequest<Merchant[]>("/v1/admin/merchants", token);
}

export function createMerchant(token: string, merchant: MerchantInput) {
  return adminRequest<Merchant>("/v1/admin/merchants", token, {
    method: "POST",
    body: JSON.stringify(merchant),
  });
}

export function updateMerchant(token: string, id: string, merchant: Partial<MerchantInput>) {
  return adminRequest<Merchant>(`/v1/admin/merchants/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(merchant),
  });
}

export function refetchMerchant(token: string, id: string) {
  return adminRequest<{ message: string }>(`/v1/admin/merchants/${id}/refetch`, token, {
    method: "POST",
  });
}

export function deleteMerchant(token: string, id: string) {
  return adminRequest<{ message: string }>(`/v1/admin/merchants/${id}`, token, {
    method: "DELETE",
  });
}

// Milestones
export function fetchMilestones(token: string) {
  return adminRequest<Milestone[]>("/v1/admin/milestones", token);
}

export function createMilestone(token: string, milestone: MilestoneInput) {
  return adminRequest<Milestone>("/v1/admin/milestones", token, {
    method: "POST",
    body: JSON.stringify(milestone),
  });
}

export function updateMilestone(
  token: string,
  id: number,
  milestone: Partial<MilestoneInput> & { reset_trigger?: boolean },
) {
  return adminRequest<Milestone>(`/v1/admin/milestones/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(milestone),
  });
}

// Scenes
export function fetchScenesAdmin(token: string) {
  return adminRequest<Scene[]>("/v1/admin/scenes", token);
}

export function createScene(token: string, scene: SceneInput) {
  return adminRequest<Scene>("/v1/admin/scenes", token, {
    method: "POST",
    body: JSON.stringify(scene),
  });
}

export function updateScene(token: string, id: string, scene: Partial<SceneInput>) {
  return adminRequest<Scene>(`/v1/admin/scenes/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(scene),
  });
}

export function deleteScene(token: string, id: string) {
  return adminRequest<{ message: string }>(`/v1/admin/scenes/${id}`, token, {
    method: "DELETE",
  });
}
