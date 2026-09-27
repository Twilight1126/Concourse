import {
    createApplication as createApplicationService,
    getAllApplications,
    updateApplication as updateApplicationService,
} from "./applications.service.js";

export async function listApplications(_request, response) {
    const applications = await getAllApplications();

    response.status(200).json({
        data: applications,
    });
}

export async function createApplication(request, response) {
    const application = await createApplicationService(request.body);

    response.status(201).json({
        data: application,
    });
}

export async function updateApplication(request, response) {
    const application = await updateApplicationService(
        request.params.id,
        request.body,
    );

    response.status(200).json({
        data: application,
    });
}