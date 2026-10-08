import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("./page-capture.js", import.meta.url), "utf8");

test("recognizes a Darwinbox jobDetails page as a job description", () => {
  const bodyText = "Software Engineer, Fullstack\nBangalore, Karnataka, India\n2 - 4 Years\nJob Description\n"
    + "Design and develop full stack applications. ".repeat(12);
  const main = { textContent: bodyText, innerText: bodyText, getClientRects: () => [1] };
  const title = { textContent: "Software Engineer, Fullstack", parentElement: { parentElement: main }, getClientRects: () => [1] };
  const apply = { textContent: "Apply Now", value: "", getAttribute: () => "", getClientRects: () => [1] };
  const document = {
    body: { innerText: bodyText },
    querySelector(selector) {
      if (selector === "header img[alt]") return { alt: "ADA logo" };
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "button, a, [role='button'], input[type='submit']") return [apply];
      if (selector === "main h1" || selector === "h1, [role='heading'][aria-level='1']") return [title];
      if (selector === "main") return [main];
      return [];
    },
    createElement() { return { innerHTML: "", textContent: "" }; },
  };
  const url = "https://adaglobal.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a6a58715d45a86";
  const context = vm.createContext({
    document,
    location: { href: url, hostname: "adaglobal.darwinbox.com", pathname: "/ms/candidatev2/main/careers/jobDetails/a6a58715d45a86" },
    getComputedStyle: () => ({ visibility: "visible", display: "block" }),
  });
  vm.runInContext(source, context);

  const capture = context.ConcourseCapture.captureCurrentPage();
  assert.equal(capture.type, "application");
  assert.equal(capture.pageKind, "description");
  assert.equal(capture.data.company_name, "ADA");
  assert.equal(capture.data.job_title, "Software Engineer, Fullstack");
});

test("opens review on a job description even when the company needs manual correction", () => {
  const bodyText = "Full Stack Engineer – Web & AI Applications\nAbout the Role\n"
    + "Build and ship full stack applications. ".repeat(12);
  const main = { textContent: bodyText, innerText: bodyText, getClientRects: () => [1] };
  const title = { textContent: "Full Stack Engineer – Web & AI Applications", parentElement: { parentElement: main }, getClientRects: () => [1] };
  const document = {
    body: { innerText: bodyText },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === "button, a, [role='button'], input[type='submit']") return [];
      if (selector === "main h1" || selector === "h1, [role='heading'][aria-level='1']") return [title];
      if (selector === "main") return [main];
      return [];
    },
    createElement() { return { innerHTML: "", textContent: "" }; },
  };
  const url = "https://jobs.example.com/careers/jobdetails/88669";
  const context = vm.createContext({
    document,
    location: { href: url, hostname: "jobs.example.com", pathname: "/careers/jobdetails/88669" },
    getComputedStyle: () => ({ visibility: "visible", display: "block" }),
  });
  vm.runInContext(source, context);
  const capture = context.ConcourseCapture.captureCurrentPage();
  assert.equal(capture.type, "application");
  assert.equal(capture.pageKind, "description");
  assert.equal(capture.data.job_title, "Full Stack Engineer – Web & AI Applications");
});

test("captures an Indeed viewjob page when the description has Indeed markup", () => {
  const jobText = "Build reliable software for our customers. ".repeat(12);
  const title = { textContent: "Software Engineer", getClientRects: () => [1] };
  const description = { textContent: jobText, getClientRects: () => [1] };
  const document = {
    body: { innerText: `Software Engineer\nExample Labs\n${jobText}` },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === "#jobDescriptionText") return [description];
      if (selector === "main h1" || selector === "h1") return [title];
      return [];
    },
    createElement() { return { innerHTML: "", textContent: "" }; },
  };
  const url = "https://in.indeed.com/viewjob?jk=example123";
  const context = vm.createContext({
    document,
    location: { href: url, hostname: "in.indeed.com", pathname: "/viewjob" },
    getComputedStyle: () => ({ visibility: "visible", display: "block" }),
  });
  vm.runInContext(source, context);
  const capture = context.ConcourseCapture.captureCurrentPage();
  assert.equal(capture.type, "application");
  assert.equal(capture.pageKind, "description");
  assert.equal(capture.data.job_title, "Software Engineer");
  assert.equal(capture.data.source, "Indeed");
});
