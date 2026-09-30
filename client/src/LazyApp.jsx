import { lazy } from "react";

const LazyApp = lazy(() => import("./App.jsx"));

export default LazyApp;
