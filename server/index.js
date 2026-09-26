import express from  "express";

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get("/api/health", (_request, response) => {
    response.status(200).json({
        status: "ok",
        service: "concourse-api",
    });
});

app.listen(port, () => {
    console.log(`Concourse API Listening on http://Localhost:${port}`);
});
