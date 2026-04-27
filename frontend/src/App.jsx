import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import EditorPage from "./pages/EditorPage";
import AdminPage from "./pages/AdminPage";
import RegisterPage from "./pages/RegisterPage";

function RouteLogger() {
  const location = useLocation();
  console.log("Current Route:",location.pathname, location.hash);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RouteLogger />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;