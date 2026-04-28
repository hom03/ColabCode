import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ActiveUsersProvider } from "./context/ActiveUsersContext.jsx";
import LoginPage from "./pages/LoginPage";
import EditorPage from "./pages/EditorPage";
import AdminPage from "./pages/AdminPage";
import RegisterPage from "./pages/RegisterPage";

function App() {
  return (
    <ActiveUsersProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
      </BrowserRouter>
    </ActiveUsersProvider>
  );
}

export default App;