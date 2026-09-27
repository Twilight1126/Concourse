import {
    createApplication as createApplicationService,
    getAllApplications
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