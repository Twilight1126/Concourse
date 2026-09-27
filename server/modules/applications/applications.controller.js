import {
    createApplication as createApplicationService,
    deleteApplication as deleteApplicationService,
    getAllApplications,
    getApplicationById as getApplicationByIdService,
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
  // Return one application using its URL ID.
export async function getApplicationById(request, response) {
    const application = await getApplicationByIdService(
        request.params.id
    );

    response.status(200).json({
        data: application,
    });
}
  // Delete one application using its URL ID.
export async function deleteApplication(request, response) {
    await deleteApplicationService(request.params.id);
    response.status(204).send();
}