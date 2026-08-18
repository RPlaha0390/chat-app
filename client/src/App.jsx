import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChatPage } from './pages/ChatPage';

// Exported so the redirect-vs-wait decision can be tested directly —
// mounting the whole App would drag in a real Socket.IO connection.
export function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  // Don't decide anything while the stored token is still being checked
  // — redirecting here would bounce a valid session out on every refresh.
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading…</div>;
  }
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        {/* basename matches vite.config.js's `base` — GitHub Pages serves
            this app from /chat-app/, so routes must be computed relative
            to that, not the domain root. */}
        <BrowserRouter basename="/chat-app/">
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
