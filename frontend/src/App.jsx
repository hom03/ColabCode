import React, {useEffect} from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import EditorPage from "./pages/EditorPage";
import AdminPage from "./pages/AdminPage";
import { connectCRDT } from "./api/crdtClient";

function App() {

  useEffect(() => {
    const crdt = connectCRDT((op) => {
      console.log("CRDT update:", op);
    });

    crdt.add("test message");

    return () => crdt.close();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;