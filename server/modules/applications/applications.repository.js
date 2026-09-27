import { databasePool } from "../../db/connection.js";


export async function findAllApplications() {
    const [applications] = await databasePool.query(
        `
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
        `,
    );

    return applications;
}

export async function findApplicationById(id) {
    const [applications] = await databasePool.execute(`
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
        WHERE id = ?
    `,
        [id],
    );

    return applications[0] ?? null;
}

export async function insertApplication(application) {
    const [result] = await databasePool.execute(
        `
            INSERT INTO applications (
                company_name,
                job_title,
                job_url,
                source,
                status,
                applied_at,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            application.company_name,
            application.job_title,
            application.job_url,
            application.source,
            application.status,
            application.applied_at,
            application.notes
        ],
    );

    return result.insertId;
}

  export async function updateApplicationById(id, application) {
    const [result] = await databasePool.execute(
        `   UpDATE applications
            SET
                company_name = ?,
                job_title = ?,
                job_url = ?,
                source = ?,
                status = ?,
                applied_at = ?,
                notes = ?
            WHERE id = ?
        `,
        [
            application.company_name,
            application.job_title,
            application.job_url,
            application.source,
            application.status,
            application.applied_at,
            application.notes,
            id
        ],
    );

    return result.affectedRows > 0;
}