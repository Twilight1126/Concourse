import { apiRequest } from "./client";

export const getOutreach = () => apiRequest("/outreach");
export const createOutreach = (record) => apiRequest("/outreach", { method: "POST", body: JSON.stringify(record) });
export const updateOutreach = (id, changes) => apiRequest(`/outreach/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
export const deleteOutreach = (id) => apiRequest(`/outreach/${id}`, { method: "DELETE" });
