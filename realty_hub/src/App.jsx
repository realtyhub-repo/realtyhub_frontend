import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { RedirectIfAuthenticated, RequireAuth } from '@/auth/RequireAuth'
import { GOOGLE_CLIENT_ID } from '@/components/auth/GoogleSignIn'
import { PanelLayout } from '@/layouts/PanelLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { ADMIN, ROLES_ACUERDOS, ROLES_COMISIONES } from '@/lib/commission'
import { ROLES_DETALLE_CONTRATO, ROLES_LISTA_CONTRATOS } from '@/lib/contract'
import { PUBLISHER_ROLES } from '@/lib/property'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'
import PanelHomePage from '@/pages/PanelHomePage'
import AgentsPage from '@/pages/panel/AgentsPage'
import AgreementCreatePage from '@/pages/panel/AgreementCreatePage'
import AgreementDetailPage from '@/pages/panel/AgreementDetailPage'
import AgreementsPage from '@/pages/panel/AgreementsPage'
import CommissionDetailPage from '@/pages/panel/CommissionDetailPage'
import CommissionsPage from '@/pages/panel/CommissionsPage'
import ContractDetailPage from '@/pages/panel/ContractDetailPage'
import ContractsPage from '@/pages/panel/ContractsPage'
import LeadDetailPage from '@/pages/panel/LeadDetailPage'
import LeadsPage from '@/pages/panel/LeadsPage'
import NotificationsPage from '@/pages/panel/NotificationsPage'
import OfficesPage from '@/pages/panel/OfficesPage'
import PropertiesPage from '@/pages/panel/PropertiesPage'
import PropertyCreatePage from '@/pages/panel/PropertyCreatePage'
import PropertyManagePage from '@/pages/panel/PropertyManagePage'
import ProfilePage from '@/pages/panel/ProfilePage'
import UsersPage from '@/pages/panel/UsersPage'
import VisitsPage from '@/pages/panel/VisitsPage'
import AgentProfilePage from '@/pages/public/AgentProfilePage'
import OfficeDetailPage from '@/pages/public/OfficeDetailPage'
import OfficesDirectoryPage from '@/pages/public/OfficesDirectoryPage'
import PropertiesCatalogPage from '@/pages/public/PropertiesCatalogPage'
import HomePage from '@/pages/public/HomePage'
import PropertyDetailPage from '@/pages/public/PropertyDetailPage'

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

          {/* Sitio público (sin sesión): GET /propiedades/**, GET /oficinas/** y GET /agentes/** */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/propiedades" element={<PropertiesCatalogPage />} />
            <Route path="/propiedades/:id" element={<PropertyDetailPage />} />
            <Route path="/oficinas" element={<OfficesDirectoryPage />} />
            <Route path="/oficinas/:id" element={<OfficeDetailPage />} />
            <Route path="/agentes/:id" element={<AgentProfilePage />} />
            <Route path="/agentes/usuario/:usuarioId" element={<AgentProfilePage />} />
          </Route>

          {/* Privadas */}
          <Route element={<RequireAuth />}>
            <Route path="/panel" element={<PanelLayout />}>
              <Route index element={<PanelHomePage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="notificaciones" element={<NotificationsPage />} />
              {/* Visitas: el CLIENTE ve las suyas; los demás roles, su agenda semanal (docs/visits-service.md) */}
              <Route path="visitas" element={<VisitsPage />} />
              <Route element={<RequireAuth roles={['ADMINISTRADOR_CENTRAL']} />}>
                <Route path="usuarios" element={<UsersPage />} />
                <Route path="oficinas" element={<OfficesPage />} />
              </Route>
              <Route element={<RequireAuth roles={['ADMINISTRADOR_CENTRAL', 'GERENTE_OFICINA']} />}>
                <Route path="agentes" element={<AgentsPage />} />
              </Route>
              {/* Propiedades: cualquier rol interno puede publicar; CLIENTE recibiría 403 (docs/property-service.md §2) */}
              <Route element={<RequireAuth roles={PUBLISHER_ROLES} />}>
                <Route path="propiedades" element={<PropertiesPage />} />
                <Route path="propiedades/nueva" element={<PropertyCreatePage />} />
                <Route path="propiedades/:id" element={<PropertyManagePage />} />
              </Route>
              {/* Leads: pipeline del agente; el admin central puede abrir y mover cualquier lead (docs/leads-service.md) */}
              <Route element={<RequireAuth roles={['ADMINISTRADOR_CENTRAL', 'AGENTE']} />}>
                <Route path="leads" element={<LeadsPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
              </Route>
              {/* Contratos: lista para agente y cliente; el admin solo abre detalles; el gerente recibe 403 (docs/contratos-service.md) */}
              <Route element={<RequireAuth roles={ROLES_LISTA_CONTRATOS} />}>
                <Route path="contratos" element={<ContractsPage />} />
              </Route>
              <Route element={<RequireAuth roles={ROLES_DETALLE_CONTRATO} />}>
                <Route path="contratos/:id" element={<ContractDetailPage />} />
              </Route>
              {/* Comisiones: agente (las suyas), gerente (su oficina) y admin (todas); el CLIENTE recibe 403 (docs/comisiones-service.md) */}
              <Route element={<RequireAuth roles={ROLES_COMISIONES} />}>
                <Route path="comisiones" element={<CommissionsPage />} />
                <Route path="comisiones/:id" element={<CommissionDetailPage />} />
              </Route>
              {/* Acuerdos comerciales: el gerente solo consulta; crear y cerrar es del admin */}
              <Route element={<RequireAuth roles={ROLES_ACUERDOS} />}>
                <Route path="acuerdos" element={<AgreementsPage />} />
                <Route path="acuerdos/:id" element={<AgreementDetailPage />} />
              </Route>
              <Route element={<RequireAuth roles={[ADMIN]} />}>
                <Route path="acuerdos/nuevo" element={<AgreementCreatePage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  )
}
