import { databasePool } from "../../../db/connection.js";
import { mysqlSourceGroup } from "../../dashboard/source-group.js";

const COLUMNS = `
  id, company_name, job_title, job_url, source, location, work_mode,
  employment_type, experience_min, experience_max, salary_min, salary_max,
  salary_currency, salary_period, expected_salary, experience_required,
  salary_budget, resume_filename, interview_stage, interview_at, rejection_reason, status, applied_at,
  next_action, follow_up_at, notes, created_at, updated_at
`;

export const mysqlApplicationsRepository = (userId) => ({
  async findAll() {
    const [rows] = await databasePool.query(
      `SELECT ${COLUMNS} FROM applications WHERE user_id = ? ORDER BY updated_at DESC, id DESC`,
      [userId],
    );
    return rows;
  },

  async findPage({ page, search, status, source }) {
    const sourceGroup = mysqlSourceGroup("a");
    const filters = ["a.user_id = ?"];
    const values = [userId];
    if (search) {
      filters.push("(company_name LIKE ? OR job_title LIKE ? OR location LIKE ? OR source LIKE ? OR work_mode LIKE ?)");
      values.push(...Array(5).fill(`%${search}%`));
    }
    if (status) { filters.push("status = ?"); values.push(status); }
    if (source) { filters.push(`${sourceGroup} = ?`); values.push(source); }
    const where = filters.join(" AND ");
    const [[countRows], [items], [sourceRows]] = await Promise.all([
      databasePool.query(`SELECT COUNT(*) AS total FROM applications a WHERE ${where}`, values),
      databasePool.query(`SELECT ${COLUMNS} FROM applications a WHERE ${where} ORDER BY updated_at DESC, id DESC LIMIT 10 OFFSET ?`, [...values, (page - 1) * 10]),
      databasePool.query(`SELECT DISTINCT ${sourceGroup} AS source FROM applications a WHERE a.user_id = ? ORDER BY source`, [userId]),
    ]);
    return { items, total: countRows[0].total, page, page_size: 10, sources: sourceRows.map((row) => row.source) };
  },

  async findById(id) {
    const [rows] = await databasePool.execute(
      `SELECT ${COLUMNS} FROM applications WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    return rows[0] ?? null;
  },

  async insert(application) {
    const [result] = await databasePool.execute(
      `INSERT INTO applications
        (user_id, company_name, job_title, job_url, source, location, work_mode,
         employment_type, experience_min, experience_max, salary_min, salary_max,
         salary_currency, salary_period, expected_salary, experience_required,
         salary_budget, resume_filename, interview_stage, interview_at, rejection_reason, status, applied_at,
         next_action, follow_up_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        application.company_name,
        application.job_title,
        application.job_url,
        application.source,
        application.location,
        application.work_mode,
        application.employment_type,
        application.experience_min,
        application.experience_max,
        application.salary_min,
        application.salary_max,
        application.salary_currency,
        application.salary_period,
        application.expected_salary,
        application.experience_required,
        application.salary_budget,
        application.resume_filename,
        application.interview_stage,
        application.interview_at,
        application.rejection_reason,
        application.status,
        application.applied_at,
        application.next_action,
        application.follow_up_at,
        application.notes,
      ],
    );
    return this.findById(result.insertId);
  },

  async update(id, application) {
    await databasePool.execute(
      `UPDATE applications SET
        company_name = ?, job_title = ?, job_url = ?, source = ?, location = ?,
        work_mode = ?, employment_type = ?, experience_min = ?, experience_max = ?,
        salary_min = ?, salary_max = ?, salary_currency = ?, salary_period = ?,
        expected_salary = ?, experience_required = ?, salary_budget = ?,
        resume_filename = ?, interview_stage = ?, interview_at = ?, rejection_reason = ?, status = ?, applied_at = ?, next_action = ?,
        follow_up_at = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [
        application.company_name,
        application.job_title,
        application.job_url,
        application.source,
        application.location,
        application.work_mode,
        application.employment_type,
        application.experience_min,
        application.experience_max,
        application.salary_min,
        application.salary_max,
        application.salary_currency,
        application.salary_period,
        application.expected_salary,
        application.experience_required,
        application.salary_budget,
        application.resume_filename,
        application.interview_stage,
        application.interview_at,
        application.rejection_reason,
        application.status,
        application.applied_at,
        application.next_action,
        application.follow_up_at,
        application.notes,
        id,
        userId,
      ],
    );
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await databasePool.execute(
      "DELETE FROM applications WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    return result.affectedRows > 0;
  },

  async findUpdates(applicationId) {
    const [rows] = await databasePool.execute(
      `SELECT u.id, u.application_id, u.status, u.title, u.happened_at, u.details, u.created_at, u.updated_at
       FROM application_updates u JOIN applications a ON a.id = u.application_id
       WHERE u.application_id = ? AND a.user_id = ? ORDER BY u.happened_at DESC, u.id DESC`,
      [applicationId, userId],
    );
    return rows;
  },

  async findUpdate(applicationId, updateId) {
    const [rows] = await databasePool.execute(
      `SELECT u.id, u.application_id, u.status, u.title, u.happened_at, u.details, u.created_at, u.updated_at
       FROM application_updates u JOIN applications a ON a.id = u.application_id
       WHERE u.application_id = ? AND u.id = ? AND a.user_id = ?`,
      [applicationId, updateId, userId],
    );
    return rows[0] ?? null;
  },

  async insertUpdate(update) {
    const [result] = await databasePool.execute(
      `INSERT INTO application_updates (application_id, status, title, happened_at, details)
       SELECT id, ?, ?, ?, ? FROM applications WHERE id = ? AND user_id = ?`,
      [update.status, update.title, update.happened_at, update.details, update.application_id, userId],
    );
    return this.findUpdate(update.application_id, result.insertId);
  },

  async updateUpdate(applicationId, updateId, changes) {
    await databasePool.execute(
      `UPDATE application_updates u JOIN applications a ON a.id = u.application_id
       SET u.title = ?, u.happened_at = ?, u.details = ?
       WHERE u.application_id = ? AND u.id = ? AND a.user_id = ?`,
      [changes.title, changes.happened_at, changes.details, applicationId, updateId, userId],
    );
    return this.findUpdate(applicationId, updateId);
  },

  async removeUpdate(applicationId, updateId) {
    const [result] = await databasePool.execute(
      `DELETE u FROM application_updates u JOIN applications a ON a.id = u.application_id
       WHERE u.application_id = ? AND u.id = ? AND a.user_id = ?`,
      [applicationId, updateId, userId],
    );
    return result.affectedRows > 0;
  },
});
