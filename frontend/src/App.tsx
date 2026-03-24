import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import HomePage from "./pages/HomePage";
import FoodResultPage from "./pages/FoodResultPage";
import FoodUploadPage from "./pages/FoodUploadPage";
import SurveyPage from "./pages/SurveyPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="page">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/survey" element={<SurveyPage />} />
          <Route path="/food/upload" element={<FoodUploadPage />} />
          <Route path="/food/result" element={<FoodResultPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
