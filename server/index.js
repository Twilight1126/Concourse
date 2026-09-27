import express from "express";
import { databasePool } from "./db/connection.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get("/api/health", async (_request, response) => {
    await databasePool.query("SELECT 1");

    response.status(200).json({
        status: "ok",
        service: "concourse-api",
        database: "connected",
    });
});

app.use("/api/applications", applicationsRouter);

app.use((error, _request, response, _next) => {
    console.error(error);

    response.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong.",
        },
    });
});


app.listen(port, () => {
    console.log(`Concourse API Listening on http://Localhost:${port}`);
});
