import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { RedirectIfAuthenticated, RequireAuth } from '@/auth/RequireAuth'
import { GOOGLE_CLIENT_ID } from '@/components/auth/GoogleSignIn'
import { PanelLayout } from '@/layouts/PanelLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'
import PanelHomePage from '@/pages/PanelHomePage'
import AgentsPage from '@/pages/panel/AgentsPage'
import OfficesPage from '@/pages/panel/OfficesPage'
import ProfilePage from '@/pages/panel/ProfilePage'
import UsersPage from '@/pages/panel/UsersPage'
import AgentProfilePage from '@/pages/public/AgentProfilePage'
import OfficeDetailPage from '@/pages/public/OfficeDetailPage'
import OfficesDirectoryPage from '@/pages/public/OfficesDirectoryPage'

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

          {/* Sitio público (sin sesión): GET /oficinas/** y GET /agentes/{id} */}
          <Route element={<PublicLayout />}>
            <Route path="/oficinas" element={<OfficesDirectoryPage />} />
            <Route path="/oficinas/:id" element={<OfficeDetailPage />} />
            <Route path="/agentes/:id" element={<AgentProfilePage />} />
          </Route>

          {/* Privadas */}
          <Route element={<RequireAuth />}>
            <Route path="/panel" element={<PanelLayout />}>
              <Route index element={<PanelHomePage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route element={<RequireAuth roles={['ADMINISTRADOR_CENTRAL']} />}>
                <Route path="usuarios" element={<UsersPage />} />
                <Route path="oficinas" element={<OfficesPage />} />
              </Route>
              <Route element={<RequireAuth roles={['ADMINISTRADOR_CENTRAL', 'GERENTE_OFICINA']} />}>
                <Route path="agentes" element={<AgentsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  )
}
