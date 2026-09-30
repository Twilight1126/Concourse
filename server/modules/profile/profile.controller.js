export function createProfileController(service) {
  return {
    async get(request, response) {
      response.status(200).json({ data: await service.get(request.identity) });
    },

    async save(request, response) {
      response.status(200).json({
        data: await service.save(request.body, request.identity),
      });
    },
  };
}
