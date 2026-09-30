import { apiRequest } from "./client";

export function getProfile() {
  return apiRequest("/profile");
}

export function saveProfile(profile) {
  return apiRequest("/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}
