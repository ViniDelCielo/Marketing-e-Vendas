import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Columns, Users, Calendar as CalendarIcon, Briefcase, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CommercialDashboard from '../components/Commercial/CommercialDashboard';
import CommercialPipeline from '../components/Commercial/CommercialPipeline';
import CommercialCRM from '../components/Commercial/CommercialCRM';
import CommercialAgenda from '../components/Commercial/CommercialAgenda';
import CommercialConnectivity from '../components/Commercial/CommercialConnectivity';

const Comercial = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'dashboard');
  const [crmSubTab, setCrmSubTab] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('commercial_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, name, avatar_url, avatar_color')
        .eq('status', 'active')
        .ilike('department', '%Comercial%');
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
  }, []);

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'crm_roi', label: 'CRM Comercial ROI', icon: <Users size={18} /> },
    { id: 'agenda', label: 'Agenda Comercial', icon: <CalendarIcon size={18} /> },
    { id: 'conectividade', label: 'Conectividade do Comercial', icon: <MessageSquare size={18} /> }
  ];

  return (
    <div className="commercial-hub-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', height: 'calc(100vh - 80px)' }}>
      <header className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>
            <Briefcase className="text-primary" size={28} />
            Hub Comercial & Vendas
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Gestão de prospecção, pipeline de negócios e performance da equipe.
          </p>
        </div>
      </header>

      <div className="tabs-container" style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`glass-btn ${activeTab === tab.id ? 'primary' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchParams({ tab: tab.id });
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content" style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'dashboard' && <CommercialDashboard leads={leads} employees={employees} />}
        
        {activeTab === 'crm_roi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            <div className="sub-tabs-container" style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
              <button 
                className={`glass-btn ${crmSubTab === 'pipeline' ? 'primary' : ''}`}
                onClick={() => setCrmSubTab('pipeline')}
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Columns size={14} /> Pipeline de Vendas
              </button>
              <button 
                className={`glass-btn ${crmSubTab === 'crm' ? 'primary' : ''}`}
                onClick={() => setCrmSubTab('crm')}
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Users size={14} /> Lista de Leads (Raio-X)
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {crmSubTab === 'pipeline' && <CommercialPipeline leads={leads} employees={employees} onLeadsChange={fetchLeads} />}
              {crmSubTab === 'crm' && <CommercialCRM leads={leads} employees={employees} onLeadsChange={fetchLeads} />}
            </div>
          </div>
        )}

        {activeTab === 'agenda' && <CommercialAgenda employees={employees} />}
        {activeTab === 'conectividade' && <CommercialConnectivity employees={employees} />}
      </div>
    </div>
  );
};

export default Comercial;

