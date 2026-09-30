import assert from "node:assert/strict";
import test from "node:test";
import { createProfileService } from "./profile.service.js";

function repository(initialProfile = null) {
  let savedProfile = initialProfile;

  return {
    find: async () => savedProfile,
    upsert: async (profile) => {
      savedProfile = profile;
      return savedProfile;
    },
  };
}

test("returns null before onboarding is completed", async () => {
  const service = createProfileService(repository());

  assert.equal(await service.get(), null);
});

test("normalizes and saves a valid profile", async () => {
  const service = createProfileService(repository());

  const profile = await service.save({
    display_name: "  Chirag B  ",
    timezone: "Asia/Calcutta",
    preferred_roles: " Full Stack Developer ",
    skills: " React and Node.js ",
  }, {
    email: "CHIRAG@example.com",
    emailVerified: true,
    avatarUrl: "https://example.com/avatar.png",
  });

  assert.equal(profile.display_name, "Chirag B");
  assert.equal(profile.email, "chirag@example.com");
  assert.equal(profile.preferred_roles, "Full Stack Developer");
  assert.equal(profile.skills, "React and Node.js");
  assert.equal(profile.avatar_url, "https://example.com/avatar.png");
});

test("rejects an invalid timezone", async () => {
  const service = createProfileService(repository());

  assert.throws(
    () => service.save(
      { display_name: "Chirag", timezone: "Not/A_Timezone", preferred_roles: "Developer" },
      { email: "chirag@example.com", emailVerified: true },
    ),
    { code: "VALIDATION_ERROR" },
  );
});
