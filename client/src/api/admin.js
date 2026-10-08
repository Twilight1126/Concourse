import { apiRequest } from "./client";

export const getAdminAccess = () => apiRequest("/admin/access");
export const getAdminSummary = () => apiRequest("/admin/summary");
export const getAdminUsers = (page = 1, search = "") => apiRequest(`/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
