import { Navigate, Route, Routes } from 'react-router-dom';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import MobileAppLayout from './components/layout/MobileAppLayout.jsx';
import ChallengePage from './pages/ChallengePage.jsx';
import CheckinPage from './pages/CheckinPage.jsx';
import FoodPage from './pages/FoodPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import SignupDonePage from './pages/SignupDonePage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import GoogleCallbackPage from './pages/GoogleCallbackPage.jsx';
import SurveyLoadingPage from './pages/SurveyLoadingPage.jsx';
import SurveyPage from './pages/SurveyPage.jsx';
import SurveyResultPage from './pages/SurveyResultPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

function hasAccessToken() {
  return Boolean(localStorage.getItem('access_token'));
}

function RequireAuth({ children }) {
  return hasAccessToken() ? children : <Navigate to="/auth/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={hasAccessToken() ? '/home' : '/auth/login'} replace />} />
      <Route
        path="/auth/login"
        element={hasAccessToken() ? <Navigate to="/home" replace /> : <LoginPage />}
      />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/signup/sent" element={<SignupDonePage />} />
      <Route
        path="/survey"
        element={(
          <RequireAuth>
            <SurveyPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/survey/loading"
        element={(
          <RequireAuth>
            <SurveyLoadingPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/survey/result"
        element={(
          <RequireAuth>
            <SurveyResultPage />
          </RequireAuth>
        )}
      />
      <Route element={<MobileAppLayout />}>
        <Route
          path="/admin/users"
          element={(
            <RequireAuth>
              <AdminUsersPage />
            </RequireAuth>
          )}
        />
        <Route
          path="/home"
          element={(
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          )}
        />
        <Route
          path="/checkin"
          element={(
            <RequireAuth>
              <CheckinPage />
            </RequireAuth>
          )}
        />
        <Route
          path="/challenge"
          element={(
            <RequireAuth>
              <ChallengePage />
            </RequireAuth>
          )}
        />
        <Route
          path="/food"
          element={(
            <RequireAuth>
              <FoodPage />
            </RequireAuth>
          )}
        />
        <Route
          path="/profile"
          element={(
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          )}
        />
        <Route path="/settings" element={<Navigate to="/profile" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
