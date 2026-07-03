import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [allowedServices, setAllowedServices] = useState([]);
  const [deptPermissions, setDeptPermissions] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca perfil + serviços permitidos
  const fetchProfile = async (userId) => {
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) { console.warn('Perfil:', error.message); return null; }

      // Busca serviços permitidos via função do banco
      const { data: svcs } = await supabase.rpc('get_my_allowed_services');
      setAllowedServices(svcs || []);

      // Se for funcionário ou tiver employee_id, busca permissões de departamento e avatar
      if (prof.employee_id) {
        const { data: dp } = await supabase
          .from('employee_permissions')
          .select('service_id, role')
          .eq('employee_id', prof.employee_id);
        setDeptPermissions(dp || []);
        
        // Também busca can_manage_logins e avatar_url
        const { data: emp } = await supabase
          .from('employees')
          .select('can_manage_logins, avatar_url')
          .eq('id', prof.employee_id)
          .single();
        if (emp) {
          prof.can_manage_logins = emp.can_manage_logins;
          if (emp.avatar_url) prof.avatar_url = emp.avatar_url;
        }
      } else {
        setDeptPermissions([]);
      }

      // Se for cliente, busca avatar da tabela de clientes
      if (prof.client_uuid) {
        const { data: cli } = await supabase
          .from('clients')
          .select('avatar_url')
          .eq('id', prof.client_uuid)
          .single();
        if (cli && cli.avatar_url) {
          prof.avatar_url = cli.avatar_url;
        }
      }

      return prof;
    } catch (e) {
      console.warn('fetchProfile erro:', e.message);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (mounted) { setUser(session.user); setProfile(profileData); }
        }
      } catch (e) {
        console.warn('initAuth erro:', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); setAllowedServices([]); setDeptPermissions([]); return; }
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id).then(p => { if (mounted) setProfile(p); });
        }
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Tracking global de Presença (Online/Offline)
  useEffect(() => {
    if (!profile) return;
    const presenceKey = profile.employee_id || profile.client_uuid || profile.id;
    if (!presenceKey) return;

    const presenceChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const onlineIds = Object.keys(state);
      setOnlineUsers(onlineIds);
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [profile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setAllowedServices([]); setDeptPermissions([]);
  };

  // Verifica se o usuário tem acesso a um serviço específico
  const hasService = (serviceId) => {
    if (!profile) return false;
    if (profile.role === 'owner' || profile.role === 'admin') return true;
    return allowedServices.includes(serviceId);
  };

  // Verifica se o usuário é gestor (geral ou de um departamento específico)
  const isGestor = (serviceId = null) => {
    if (!profile) return false;
    if (profile.role === 'owner' || profile.role === 'admin') return true;
    if (serviceId) {
      return deptPermissions.some(p => p.service_id === serviceId && p.role === 'Gestor');
    }
    return deptPermissions.some(p => p.role === 'Gestor');
  };

  // Objeto combinado final exposto para toda a app
  const combinedUser = user && profile
    ? {
        ...user,
        role:     profile.role,
        name:     profile.name || user.email,
        dept:     profile.dept,
        clientUuid: profile.client_uuid,
        employeeId: profile.employee_id,
        can_manage_logins: profile.can_manage_logins || false,
        avatar_url: profile.avatar_url || null,
      }
    : user
    ? { ...user, role: 'client', name: user.email, avatar_url: null }
    : null;

  const roleLabel = {
    owner:    'Gestor Geral',
    admin:    'Administrador',
    employee: 'Colaborador',
    client:   'Cliente',
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f172a',
        color: 'rgba(255,255,255,0.6)', gap: 16
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span>Carregando sessão...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user: combinedUser,
      profile,
      allowedServices,
      deptPermissions,
      onlineUsers,
      hasService,
      isGestor,
      roleLabel: combinedUser ? (roleLabel[combinedUser.role] || combinedUser.role) : '',
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
