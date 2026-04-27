import React from "react";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import EditorPage from "./pages/EditorPage";
import AdminPage from "./pages/AdminPage";
import RegisterPage from "./pages/RegisterPage";

function RouteLogger() {
  const location = useLocation();
  console.log("Current Route:",location.pathname);
  return null;
}

export default function App() {
  return (
    <div style={{ padding: 50, fontSize: 40, color: "red" }}>
      DEPLOY TEST 123
    </div>
  );
}

export default App;