export function createOutreachController(serviceForRequest) {
  return {
    async list(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).list() });
    },
    async get(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).get(request.params.id) });
    },
    async create(request, response) {
      response.status(201).json({ data: await serviceForRequest(request).create(request.body) });
    },
    async update(request, response) {
      response.status(200).json({ data: await serviceForRequest(request).update(request.params.id, request.body) });
    },
    async remove(request, response) {
      await serviceForRequest(request).remove(request.params.id);
      response.status(204).send();
    },
  };
}
