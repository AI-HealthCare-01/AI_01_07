import { Navigate, Route, Routes } from 'react-router-dom';
import MobileAppLayout from './components/layout/MobileAppLayout.jsx';
import ChallengePage from './pages/ChallengePage.jsx';
import CheckinPage from './pages/CheckinPage.jsx';
import FoodPage from './pages/FoodPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import SignupDonePage from './pages/SignupDonePage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import SurveyLoadingPage from './pages/SurveyLoadingPage.jsx';
import SurveyPage from './pages/SurveyPage.jsx';
import SurveyResultPage from './pages/SurveyResultPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/signup/sent" element={<SignupDonePage />} />
      <Route path="/survey" element={<SurveyPage />} />
      <Route path="/survey/loading" element={<SurveyLoadingPage />} />
      <Route path="/survey/result" element={<SurveyResultPage />} />
      <Route element={<MobileAppLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/food" element={<FoodPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
