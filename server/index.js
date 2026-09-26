import express from  "express";
import {databasePool} from "./db/connection.js";

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
app.listen(port, () => {
    console.log(`Concourse API Listening on http://Localhost:${port}`);
});
