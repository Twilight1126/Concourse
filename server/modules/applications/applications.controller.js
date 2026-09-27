import { getAllApplications } from "./applications.service.js";
export async function listApplications(_request, response) {
    const applications = await getAllApplications();

    response.status(200).json({
        data: applications,
    });
}