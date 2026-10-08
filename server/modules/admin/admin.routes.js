import { Router } from "express";
import { databasePool } from "../../db/connection.js";
import { requireIdentity } from "../../http/express-auth.js";
import { getApiMetrics } from "./admin.metrics.js";
import { mysqlSourceGroup } from "../dashboard/source-group.js";

export const adminRouter = Router();
adminRouter.use(requireIdentity);

async function isAdmin(userId) {
  try {
    const [rows] = await databasePool.query(
      "SELECT 1 FROM admin_memberships WHERE user_id = ? LIMIT 1",
      [userId],
    );
    return rows.length > 0;
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      const setupError = new Error("Admin access is not set up in the local database.");
      setupError.status = 503;
      setupError.code = "ADMIN_SETUP_REQUIRED";
      throw setupError;
    }
    throw error;
  }
}

adminRouter.get("/access", async (request, response) => {
  response.set("Cache-Control", "no-store").json({ data: { is_admin: await isAdmin(request.identity.id) } });
});

adminRouter.get("/summary", async (request, response) => {
  if (!await isAdmin(request.identity.id)) {
    return response.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access is required." } });
  }

  await databasePool.query(
    "INSERT INTO admin_audit_logs (admin_user_id, action) VALUES (?, 'view_dashboard')",
    [request.identity.id],
  );
  const [[totals], [stages], [sources]] = await Promise.all([
    databasePool.query(`SELECT
      (SELECT COUNT(*) FROM profiles) AS members,
      (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL 7 DAY) AS new_members_7d,
      (SELECT COUNT(*) FROM applications) AS applications,
      (SELECT COUNT(*) FROM outreach) AS outreach,
      (SELECT COUNT(*) FROM outreach WHERE sent_at IS NOT NULL) AS outreach_sent,
      (SELECT COUNT(*) FROM outreach WHERE status = 'replied') AS outreach_replied`),
    databasePool.query("SELECT status, COUNT(*) AS total FROM applications GROUP BY status"),
    databasePool.query(`SELECT ${mysqlSourceGroup("a")} AS name,
      COUNT(*) AS applications, SUM(a.applied_at IS NOT NULL) AS sent
      FROM applications a GROUP BY name ORDER BY sent DESC, applications DESC, name`),
  ]);
  response.json({ data: {
    ...totals[0],
    stages: Object.fromEntries(stages.map(({ status, total }) => [status, Number(total)])),
    sources,
    operations: {
      api: getApiMetrics(),
      database: { status: "connected", checked_at: new Date().toISOString() },
    },
  } });
});

adminRouter.get("/users", async (request, response) => {
  if (!await isAdmin(request.identity.id)) {
    return response.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access is required." } });
  }
  const page = Math.max(1, Math.min(100000, Number.parseInt(request.query.page, 10) || 1));
  const search = String(request.query.search ?? "").trim().slice(0, 100);
  const pattern = `%${search}%`;
  const where = search ? "WHERE display_name LIKE ? OR email LIKE ?" : "";
  const params = search ? [pattern, pattern] : [];
  const [[countRows], [users]] = await Promise.all([
    databasePool.query(`SELECT COUNT(*) AS total FROM profiles ${where}`, params),
    databasePool.query(`SELECT user_id, display_name, avatar_url, email, phone, location, timezone,
      present_company, current_job_title, years_of_experience, skills, preferred_roles,
      current_ctc, expected_ctc, currency, notice_period_days, portfolio_url, linkedin_url,
      created_at, updated_at FROM profiles ${where}
      ORDER BY created_at DESC, id DESC LIMIT 10 OFFSET ?`, [...params, (page - 1) * 10]),
  ]);
  response.set("Cache-Control", "no-store").json({ data: { users, total: countRows[0].total, page, page_size: 10 } });
});
