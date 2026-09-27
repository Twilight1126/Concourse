import { databasePool } from "../../db/connection.js";

export async function findAllApplications() {
    const [applications] = await databasePool.query(`
        SELECT
            id,
            company_name,
            job_title,
            job_url,
            source,
            status,
            applied_at,
            notes,
            created_at,
            updated_at
        FROM applications
        ORDER BY created_at DESC, id DESC
    `);

    return applications;
}