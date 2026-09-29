export function createApplicationsController(service) {
  return {
    async list(_request, response) {
      response.status(200).json({ data: await service.list() });
    },

    async get(request, response) {
      response.status(200).json({ data: await service.get(request.params.id) });
    },

    async create(request, response) {
      response.status(201).json({ data: await service.create(request.body) });
    },

    async update(request, response) {
      response.status(200).json({
        data: await service.update(request.params.id, request.body),
      });
    },

    async remove(request, response) {
      await service.remove(request.params.id);
      response.status(204).send();
    },
  };
}
