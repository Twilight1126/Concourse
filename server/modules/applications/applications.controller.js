import { publishApplicationEvent } from "./applications.events.js";

export function createApplicationsController(serviceForRequest) {
  return {
    async list(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).list() });
    },

    async page(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).page(request.query) });
    },

    async get(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).get(request.params.id) });
    },

    async create(request, response) {
      const application = await serviceForRequest(request).create(request.body);
      publishApplicationEvent(request.identity.id, { action: "upsert", record: application });
      response.status(201).json({ data: application });
    },

    async update(request, response) {
      const application = await serviceForRequest(request).update(request.params.id, request.body);
      publishApplicationEvent(request.identity.id, { action: "upsert", record: application });
      response.status(200).json({ data: application });
    },

    async remove(request, response) {
      await serviceForRequest(request).remove(request.params.id);
      publishApplicationEvent(request.identity.id, { action: "delete", id: Number(request.params.id) });
      response.status(204).send();
    },

    async listUpdates(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).listUpdates(request.params.id) });
    },

    async createUpdate(request, response) {
      response.status(201).json({ data: await serviceForRequest(request).createUpdate(request.params.id, request.body) });
    },

    async editUpdate(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).editUpdate(request.params.id, request.params.updateId, request.body) });
    },

    async removeUpdate(request, response) {
      await serviceForRequest(request).removeUpdate(request.params.id, request.params.updateId);
      response.status(204).send();
    },
  };
}
