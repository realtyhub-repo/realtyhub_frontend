import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { RedirectIfAuthenticated, RequireAuth } from '@/auth/RequireAuth'
import { GOOGLE_CLIENT_ID } from '@/components/auth/GoogleSignIn'
import { PanelLayout } from '@/layouts/PanelLayout'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'
import PanelHomePage from '@/pages/PanelHomePage'

function Providers({ children }) {
  const app = <AuthProvider>{children}</AuthProvider>
  return GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{app}</GoogleOAuthProvider> : app
}

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          {/* Solo invitados */}
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
          </Route>

          {/* Públicas: rutas EXACTAS que usa el backend en los correos (docs/auth_service.md §7) */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />

          {/* Privadas */}
          <Route element={<RequireAuth />}>
            <Route path="/panel" element={<PanelLayout />}>
              <Route index element={<PanelHomePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  )
}
