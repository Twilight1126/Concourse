import express from "express";
import cors from "cors";
import { databasePool } from "./db/connection.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { outreachRouter } from "./modules/outreach/outreach.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { recordApiRequest } from "./modules/admin/admin.metrics.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.local.js";
import { createHash } from "node:crypto";
import { createRateLimiter } from "./http/rate-limit.js";

const app = express();
const port = process.env.PORT || 4000;
const allowApiRequest = createRateLimiter();

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
app.use("/api", (_request, response, next) => {
    const started = performance.now();
    response.set("Cache-Control", "no-store");
    response.on("finish", () => recordApiRequest(response.statusCode, performance.now() - started));
    next();
});
app.use("/api", (request, response, next) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    const key = token
        ? createHash("sha256").update(token).digest("hex").slice(0, 32)
        : `anonymous:${request.ip}`;
    if (allowApiRequest(key)) return next();
    response.set("Retry-After", "60").status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many requests. Please try again shortly." },
    });
});
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
app.use("/api/dashboard", dashboardRouter);
app.use("/api/profile", profileRouter);
app.use("/api/outreach", outreachRouter);
app.use("/api/admin", adminRouter);

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
