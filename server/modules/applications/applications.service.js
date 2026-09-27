import {
    findAllApplications,
    findApplicationById,
    insertApplication,
} from "./applications.repository.js";

export function getAllApplications() {
    return findAllApplications();
}

export async function createApplication(input = {}) {
    const application = {
        company_name: input.company_name?.trim(),
        job_title: input.job_title?.trim(),
        job_url: input.job_url?.trim() || null,
        source: input.source?.trim() || null,
        status: input.status?.trim() || "saved",
        applied_at: input.applied_at || null,
        notes: input.notes?.trim() || null,
    };
    if (!application.company_name || !application.job_title) {
        const error = new Error(
            "Company name and job title are required."
        );

        error.status = 400;
        error.code = "VALIDATION_ERROR";

        throw error;
    }

    const applicationId = await insertApplication(application);
    return await findApplicationById(applicationId);
}