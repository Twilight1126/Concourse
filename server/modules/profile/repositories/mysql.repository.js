import { databasePool } from "../../../db/connection.js";

const COLUMNS = `
  display_name, avatar_url, email, phone, location, timezone,
  present_company, current_job_title, years_of_experience, skills,
  preferred_roles, current_ctc, expected_ctc, currency,
  notice_period_days, portfolio_url, linkedin_url,
  created_at, updated_at
`;

export const mysqlProfileRepository = {
  async find(identity) {
    const [rows] = await databasePool.query(
      `SELECT ${COLUMNS} FROM profiles WHERE user_id = ? LIMIT 1`,
      [identity.id],
    );

    if (rows[0]) return rows[0];

    // Associate the pre-ownership local row with the same verified account.
    await databasePool.execute(
      `UPDATE profiles
       SET user_id = ?
       WHERE user_id IS NULL AND email = ?
       LIMIT 1`,
      [identity.id, identity.email.toLowerCase()],
    );

    const [claimedRows] = await databasePool.query(
      `SELECT ${COLUMNS} FROM profiles WHERE user_id = ? LIMIT 1`,
      [identity.id],
    );

    return claimedRows[0] ?? null;
  },

  async upsert(profile, identity) {
    await databasePool.execute(
      `INSERT INTO profiles
        (user_id, display_name, avatar_url, email, phone, location, timezone,
         present_company, current_job_title, years_of_experience, skills,
         preferred_roles, current_ctc, expected_ctc, currency,
         notice_period_days, portfolio_url, linkedin_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        avatar_url = VALUES(avatar_url),
        email = VALUES(email),
        phone = VALUES(phone),
        location = VALUES(location),
        timezone = VALUES(timezone),
        present_company = VALUES(present_company),
        current_job_title = VALUES(current_job_title),
        years_of_experience = VALUES(years_of_experience),
        skills = VALUES(skills),
        preferred_roles = VALUES(preferred_roles),
        current_ctc = VALUES(current_ctc),
        expected_ctc = VALUES(expected_ctc),
        currency = VALUES(currency),
        notice_period_days = VALUES(notice_period_days),
        portfolio_url = VALUES(portfolio_url),
        linkedin_url = VALUES(linkedin_url)`,
      [
        identity.id,
        profile.display_name,
        profile.avatar_url,
        profile.email,
        profile.phone,
        profile.location,
        profile.timezone,
        profile.present_company,
        profile.current_job_title,
        profile.years_of_experience,
        profile.skills,
        profile.preferred_roles,
        profile.current_ctc,
        profile.expected_ctc,
        profile.currency,
        profile.notice_period_days,
        profile.portfolio_url,
        profile.linkedin_url,
      ],
    );

    return this.find(identity);
  },
};
