import { Router } from "express";
import { databasePool } from "../../db/connection.js";
import { requireIdentity } from "../../http/express-auth.js";
import { mysqlSourceGroup } from "./source-group.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireIdentity);
dashboardRouter.get("/", async (request, response, next) => {
  try {
    const userId = request.identity.id;
    const group = mysqlSourceGroup("a");
    const queries = [
      ["SELECT status, COUNT(*) AS total FROM applications WHERE user_id = ? GROUP BY status", [userId]],
      [`SELECT ${group} AS name, COUNT(*) AS applications,
         SUM(a.status IN ('interviewing', 'offered')) AS interviews,
         SUM(a.status = 'offered') AS offers
       FROM applications a WHERE a.user_id = ? GROUP BY name ORDER BY applications DESC`, [userId]],
      ["SELECT DATE_FORMAT(applied_at, '%Y-%m-%d') AS day, COUNT(*) AS applications FROM applications WHERE user_id = ? AND applied_at >= CURRENT_DATE - INTERVAL 370 DAY GROUP BY day", [userId]],
      ["SELECT 'application' AS kind, id, job_title, company_name, status, updated_at FROM applications WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5", [userId]],
    ];
    const rows = await Promise.all(queries.map(async ([sql, params]) => (await databasePool.query(sql, params))[0]));
    response.json({ data: {
      stage_counts: rows[0], sources: rows[1], application_activity: rows[2],
      recent: rows[3],
    } });
  } catch (error) { next(error); }
});
