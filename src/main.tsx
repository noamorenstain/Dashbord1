import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { DataProvider } from "./data/DataContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* DataProvider מחזיק את שכבת הנתונים (Mock כרגע, OneDrive בעתיד) */}
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
);
