import { databasePool } from "../../../db/connection.js";

const COLUMNS = `
  id, company_name, job_title, job_url, source, status,
  applied_at, notes, created_at, updated_at
`;

export const mysqlApplicationsRepository = {
  async findAll() {
    const [rows] = await databasePool.query(
      `SELECT ${COLUMNS} FROM applications ORDER BY created_at DESC, id DESC`,
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await databasePool.execute(
      `SELECT ${COLUMNS} FROM applications WHERE id = ?`,
      [id],
    );
    return rows[0] ?? null;
  },

  async insert(application) {
    const [result] = await databasePool.execute(
      `INSERT INTO applications
        (company_name, job_title, job_url, source, status, applied_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        application.company_name,
        application.job_title,
        application.job_url,
        application.source,
        application.status,
        application.applied_at,
        application.notes,
      ],
    );
    return this.findById(result.insertId);
  },

  async update(id, application) {
    await databasePool.execute(
      `UPDATE applications SET
        company_name = ?, job_title = ?, job_url = ?, source = ?,
        status = ?, applied_at = ?, notes = ?
       WHERE id = ?`,
      [
        application.company_name,
        application.job_title,
        application.job_url,
        application.source,
        application.status,
        application.applied_at,
        application.notes,
        id,
      ],
    );
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await databasePool.execute(
      "DELETE FROM applications WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};
