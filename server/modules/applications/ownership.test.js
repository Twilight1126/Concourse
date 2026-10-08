import assert from "node:assert/strict";
import { after, test } from "node:test";
import { databasePool } from "../../db/connection.js";
import { mysqlApplicationsRepository } from "./repositories/mysql.repository.js";
import { mysqlOutreachRepository } from "../outreach/repositories/mysql.repository.js";

const originalExecute = databasePool.execute;
const originalQuery = databasePool.query;
const calls = [];
databasePool.execute = async (sql, values) => {
  calls.push({ sql, values });
  return [sql.startsWith("SELECT") ? [] : { affectedRows: 0 }];
};
after(() => { databasePool.execute = originalExecute; databasePool.query = originalQuery; void databasePool.end(); });

test("application and update lookups use the signed-in owner", async () => {
  const repository = mysqlApplicationsRepository("account-a");
  await repository.findById(7);
  await repository.findUpdates(7);
  await repository.findUpdate(7, 3);
  await repository.remove(7);
  assert.equal(calls.length, 4);
  for (const call of calls) {
    assert.match(call.sql, /user_id = \?/);
    assert.equal(call.values.at(-1), "account-a");
  }
});

test("outreach cannot link an application belonging to another account", async () => {
  calls.length = 0;
  const repository = mysqlOutreachRepository("account-b");
  await assert.rejects(repository.insert({ related_application_id: 7 }), { code: "INVALID_APPLICATION" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, [7, "account-b"]);
});

test("application pages count and fetch only the caller's rows", async () => {
  const queries = [];
  databasePool.query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("COUNT(*)")) return [[{ total: 0 }]];
    return [[]];
  };
  await mysqlApplicationsRepository("account-a").findPage({ page: 2, search: "", status: null, source: null });
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.match(query.sql, /user_id = \?/);
    assert.equal(query.values[0], "account-a");
  }
  assert.equal(queries.find((query) => query.sql.includes("LIMIT 10 OFFSET"))?.values.at(-1), 10);
  assert.match(queries.find((query) => query.sql.includes("LIMIT 10 OFFSET")).sql, /ORDER BY updated_at DESC, id DESC/);
});

test("application source filters use groups but selected rows retain raw sources", async () => {
  const queries = [];
  databasePool.query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
    if (sql.includes("SELECT DISTINCT")) return [[{ source: "Company portal" }]];
    return [[{ id: 7, source: "careers.example.com" }]];
  };
  const page = await mysqlApplicationsRepository("account-a").findPage({
    page: 1, search: "", status: null, source: "Company portal",
  });
  assert.deepEqual(page.sources, ["Company portal"]);
  assert.equal(page.items[0].source, "careers.example.com");
  assert.equal(queries.length, 3);
  for (const query of queries.slice(0, 2)) {
    assert.match(query.sql, /CASE[\s\S]*'Company portal'/);
    assert.deepEqual(query.values.slice(0, 2), ["account-a", "Company portal"]);
  }
  assert.match(queries[2].sql, /SELECT DISTINCT CASE/);
  assert.deepEqual(queries[2].values, ["account-a"]);
});
