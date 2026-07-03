import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import SocialMedia from './pages/SocialMedia';
import Trafego from './pages/Trafego';
import Edicao from './pages/Edicao';
import Captacao from './pages/Captacao';
import ProspeccaoAtiva from './pages/ProspeccaoAtiva';
import Design from './pages/Design';
import CRM from './pages/CRM';
import Comercial from './pages/Comercial';
import SucessoDoCliente from './pages/SucessoDoCliente';
import KanbanBoard from './pages/KanbanBoard';
import AgendaGlobal from './pages/AgendaGlobal';
import AgendaPessoal from './pages/AgendaPessoal';
import Financeiro from './pages/Financeiro';
import AdminChats from './pages/AdminChats';
import Administrativo from './pages/Administrativo';
import Aparencia from './pages/Aparencia';
import GangaHub from './pages/GangaHub/index';
import Configuracoes from './pages/Configuracoes/index';
import ConectividadeGlobal from './pages/ConectividadeGlobal';
import ConectividadeAPIs from './pages/ConectividadeAPIs/index';
import ErrorBoundary from './components/ErrorBoundary';
import ClientPortal from './pages/ClientPortal';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import TarefasFeitas from './pages/TarefasFeitas';

// Rota protegida: verifica autenticação E (opcionalmente) acesso a um serviço específico
const ProtectedRoute = ({ children, ownerOnly = false, managerOnly = false, allowConfigAccess = false, globalManagerAccess = false, serviceId = null, employeeOnly = false }) => {
  const { user, hasService, isGestor } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // Bloqueia clientes de acessar páginas exclusivas de funcionários
  if (employeeOnly && user.role === 'client') {
    return <Navigate to="/" replace />;
  }

  if (ownerOnly && user.role !== 'owner' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (allowConfigAccess) {
    const canAccess = isGestor() || user.role === 'owner' || user.role === 'admin' || user.can_manage_logins || hasService('financeiro');
    if (!canAccess) return <Navigate to="/" replace />;
  } else if (globalManagerAccess) {
    const canAccess = isGestor() || user.role === 'owner' || user.role === 'admin';
    if (!canAccess) return <Navigate to="/" replace />;
  } else if (managerOnly && !isGestor(serviceId)) {
    return <Navigate to="/" replace />;
  }

  if (serviceId && !hasService(serviceId)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

      {/* Layout principal — requer autenticação */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />

        {/* Departamentos — protegidos por serviço */}
        <Route path="/social-media"   element={<ProtectedRoute serviceId="social-media"><SocialMedia /></ProtectedRoute>} />
        <Route path="/trafego"        element={<ProtectedRoute serviceId="trafego"><Trafego /></ProtectedRoute>} />
        <Route path="/edicao"         element={<ProtectedRoute serviceId="edicao"><Edicao /></ProtectedRoute>} />
        <Route path="/prospeccao-ativa" element={<ProtectedRoute serviceId="prospeccao-ativa"><ProspeccaoAtiva /></ProtectedRoute>} />
        <Route path="/captacao"       element={<ProtectedRoute serviceId="captacao"><Captacao /></ProtectedRoute>} />
        <Route path="/design"         element={<ProtectedRoute serviceId="design"><Design /></ProtectedRoute>} />
        <Route path="/crm"            element={<ProtectedRoute serviceId="crm"><CRM /></ProtectedRoute>} />
        <Route path="/comercial"      element={<ProtectedRoute serviceId="comercial"><Comercial /></ProtectedRoute>} />
        <Route path="/sucesso-do-cliente" element={<ProtectedRoute employeeOnly serviceId="acompanhamento"><SucessoDoCliente /></ProtectedRoute>} />
        <Route path="/kanban"         element={<ProtectedRoute globalManagerAccess><KanbanBoard /></ProtectedRoute>} />
        <Route path="/agenda-global"    element={<ProtectedRoute><AgendaGlobal /></ProtectedRoute>} />
        <Route path="/agenda-pessoal"   element={<ProtectedRoute employeeOnly><AgendaPessoal /></ProtectedRoute>} />
        <Route path="/financeiro"     element={<ProtectedRoute serviceId="financeiro"><Financeiro /></ProtectedRoute>} />
        <Route path="/aparencia"      element={<ProtectedRoute><Aparencia /></ProtectedRoute>} />
        <Route path="/ganga-hub"      element={<ProtectedRoute serviceId="ganga-hub"><GangaHub /></ProtectedRoute>} />
        <Route path="/chat-interno"   element={<ProtectedRoute employeeOnly><AdminChats internalOnly={true} /></ProtectedRoute>} />

        {/* Rotas acessíveis a todos os usuários autenticados (com filtragem interna por role) */}
        <Route path="/meu-portal"    element={<ProtectedRoute><ClientPortal /></ProtectedRoute>} />
        <Route path="/meu-chat"      element={<ProtectedRoute><AdminChats clientMode={true} /></ProtectedRoute>} />

        {/* Exclusivo colaboradores (Chat Clientes) */}
        <Route path="/admin-chats"   element={<ProtectedRoute employeeOnly><AdminChats /></ProtectedRoute>} />
        <Route path="/administrativo" element={<ProtectedRoute managerOnly><Administrativo /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute allowConfigAccess><Configuracoes /></ProtectedRoute>} />
        <Route path="/conectividade" element={<ProtectedRoute ownerOnly><ConectividadeGlobal /></ProtectedRoute>} />
        <Route path="/conectividade-apis" element={<ProtectedRoute ownerOnly><ConectividadeAPIs /></ProtectedRoute>} />
        <Route path="/tarefas-feitas" element={<ProtectedRoute ownerOnly><TarefasFeitas /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <ThemeProvider>
    <ConfirmProvider>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </ConfirmProvider>
  </ThemeProvider>
);

export default App;
