import {
    deleteApplicationById,
    findAllApplications,
    findApplicationById,
    insertApplication,
    updateApplicationById,
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
  // Return one application or clear 404 error
    export async function getApplicationById(id) {
    const application = await findApplicationById(id);

    if (!application) {
        const error = new Error("Application not found.");
        error.status = 404;
        error.code = "APPLICATION_NOT_FOUND";

        throw error;
    }
    return application;
}

export async function updateApplication(id, input = {}) {
    const  existingApplication = await findApplicationById(id);
    if (!existingApplication) {
        const error = new Error("Application not found.");
        error.status = 404;
        error.code = "APPLICATION_NOT_FOUND";

        throw error;
    }
    const application = {
        company_name:
          input.company_name === undefined
            ? existingApplication.company_name
            : input.company_name?.trim(),
        job_title:
          input.job_title === undefined
            ? existingApplication.job_title
            : input.job_title?.trim(),
        job_url:
          input.job_url === undefined
            ? existingApplication.job_url
            : input.job_url?.trim() || null,
        source:
          input.source === undefined
            ? existingApplication.source
            : input.source?.trim() || null,
        status:
          input.status === undefined
            ? existingApplication.status
            : input.status?.trim(),
        applied_at:
          input.applied_at === undefined
            ? existingApplication.applied_at
            : input.applied_at || null,
        notes:
          input.notes === undefined
            ? existingApplication.notes
            : input.notes?.trim() || null,
    };
        if (!application.company_name || !application.job_title) {
        const error = new Error(
            "Company name and job title are required."
        );
        error.status = 400;
        error.code = "VALIDATION_ERROR";

        throw error;
    }

    await updateApplicationById(id, application);
    return await findApplicationById(id);
}

  // Delete one application or return 404 error
export async function deleteApplication(id) {
    const deleted = await deleteApplicationById(id);

    if (!deleted) {
        const error = new Error("Application not found.");
        error.status = 404;
        error.code = "APPLICATION_NOT_FOUND";
        throw error;
    }
}