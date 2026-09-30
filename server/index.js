import express from "express";
import cors from "cors";
import { databasePool } from "./db/connection.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8787",
    "http://127.0.0.1:8787",
    process.env.CLIENT_ORIGIN,
].filter(Boolean);

// Allow requests only from configured browser applications.
app.use(
    cors({
        origin: allowedOrigins,
    }),
);
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
app.use("/api/profile", profileRouter);

app.use((error, _request, response, _next) => {
    console.error(error);
    const status = error.status || 500;

    response.status(status).json({
        error: {
            code: error.code || "INTERNAL_SERVER_ERROR",
            message:
                status === 500
                    ? "Something went wrong."
                    : error.message,
        },
    });
});


app.listen(port, () => {
    console.log(`Concourse API Listening on http://Localhost:${port}`);
});
