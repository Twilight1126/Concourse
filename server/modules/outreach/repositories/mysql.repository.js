import { databasePool } from "../../../db/connection.js";

const COLUMNS = `
  id, contact_name, contact_title, company_name, contact_email, sender_email,
  subject, resume_filename, linkedin_url, source, contact_source, outreach_type,
  related_application_id, status, sent_at, follow_up_at, notes, created_at, updated_at
`;

const WRITABLE_COLUMNS = [
  "contact_name", "contact_title", "company_name", "contact_email", "sender_email",
  "subject", "resume_filename", "linkedin_url", "source", "contact_source",
  "outreach_type", "related_application_id", "status", "sent_at", "follow_up_at", "notes",
];

function values(record) {
  return WRITABLE_COLUMNS.map((column) => record[column]);
}

export const mysqlOutreachRepository = (userId) => ({
  async findAll() {
    const [rows] = await databasePool.query(
      `SELECT ${COLUMNS} FROM outreach WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
      [userId],
    );
    return rows;
  },
  async findById(id) {
    const [rows] = await databasePool.execute(
      `SELECT ${COLUMNS} FROM outreach WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    return rows[0] ?? null;
  },
  async insert(record) {
    await ensureRelatedApplicationOwned(record.related_application_id, userId);
    const placeholders = WRITABLE_COLUMNS.map(() => "?").join(", ");
    const [result] = await databasePool.execute(
      `INSERT INTO outreach (user_id, ${WRITABLE_COLUMNS.join(", ")}) VALUES (?, ${placeholders})`,
      [userId, ...values(record)],
    );
    return this.findById(result.insertId);
  },
  async update(id, record) {
    await ensureRelatedApplicationOwned(record.related_application_id, userId);
    const assignments = WRITABLE_COLUMNS.map((column) => `${column} = ?`).join(", ");
    await databasePool.execute(
      `UPDATE outreach SET ${assignments} WHERE id = ? AND user_id = ?`,
      [...values(record), id, userId],
    );
    return this.findById(id);
  },
  async remove(id) {
    const [result] = await databasePool.execute("DELETE FROM outreach WHERE id = ? AND user_id = ?", [id, userId]);
    return result.affectedRows > 0;
  },

});

async function ensureRelatedApplicationOwned(applicationId, userId) {
  if (applicationId == null) return;
  const [rows] = await databasePool.execute("SELECT 1 FROM applications WHERE id = ? AND user_id = ? LIMIT 1", [applicationId, userId]);
  if (!rows.length) {
    const error = new Error("The linked application is unavailable.");
    error.status = 400;
    error.code = "INVALID_APPLICATION";
    throw error;
  }
}
