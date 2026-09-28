import { apiRequest } from "./client";

export function getApplications() {
    return apiRequest('/applications')
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