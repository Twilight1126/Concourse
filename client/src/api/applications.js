import { apiRequest } from "./client";

export function getApplications() {
    return apiRequest('/applications')
}

export function getApplicationPage({ page, search, status, source }) {
    const params = new URLSearchParams({ page: String(page), search, status, source })
    return apiRequest(`/applications/page?${params}`)
}

export function getApplication(id) {
    return apiRequest(`/applications/${encodeURIComponent(id)}`)
}

export function createApplication(application) {
    return apiRequest('/applications', {
        method: 'POST',
        body: JSON.stringify(application),
    })
}
// Update only the supplied fields for one application.
export function updateApplication(id, changes) {
    return apiRequest(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
    })
}
// Delete one application by its ID.
export function deleteApplication(id) {
    return apiRequest(`/applications/${id}`, {
        method: 'DELETE',
    })
}

export const getApplicationUpdates = (id) => apiRequest(`/applications/${encodeURIComponent(id)}/updates`);
export const createApplicationUpdate = (id, values) => apiRequest(`/applications/${encodeURIComponent(id)}/updates`, { method: "POST", body: JSON.stringify(values) });
export const editApplicationUpdate = (id, updateId, values) => apiRequest(`/applications/${encodeURIComponent(id)}/updates/${encodeURIComponent(updateId)}`, { method: "PATCH", body: JSON.stringify(values) });
export const deleteApplicationUpdate = (id, updateId) => apiRequest(`/applications/${encodeURIComponent(id)}/updates/${encodeURIComponent(updateId)}`, { method: "DELETE" });
