import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useMeetings = (clientId, department) => {
  const [meetings, setMeetings] = useState([]);
  const [allClientMeetings, setAllClientMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      // Reuniões deste departamento
      const { data: deptData } = await supabase
        .from('client_meetings')
        .select('*')
        .eq('client_id', clientId)
        .eq('department', department)
        .order('scheduled_at', { ascending: true });
      setMeetings(deptData || []);

      // TODAS reuniões do cliente (para anti-choque)
      const { data: allData } = await supabase
        .from('client_meetings')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: true });
      setAllClientMeetings(allData || []);
    } catch (e) { console.error('useMeetings error:', e); }
    setLoading(false);
  }, [clientId, department]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const createMeeting = async (meetingData) => {
    const { data, error } = await supabase
      .from('client_meetings')
      .insert([{ ...meetingData, client_id: clientId, department, status: 'Aguardando Aprovação', client_approval: 'pending' }])
      .select().single();
    if (error) throw error;
    await fetchMeetings();
    return data;
  };

  const updateMeeting = async (id, updates) => {
    const { error } = await supabase.from('client_meetings').update(updates).eq('id', id);
    if (error) throw error;
    await fetchMeetings();
  };

  const deleteMeeting = async (id) => {
    const { error } = await supabase.from('client_meetings').delete().eq('id', id);
    if (error) throw error;
    await fetchMeetings();
  };

  const requestJoin = async (meetingId, dept, requestedBy, requestedByName) => {
    const meeting = allClientMeetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const reqs = [...(meeting.join_requests || []), { dept, requestedBy, requestedByName, status: 'pending' }];
    await updateMeeting(meetingId, { join_requests: reqs });
  };

  const approveJoin = async (meetingId, dept) => {
    const meeting = allClientMeetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const reqs = (meeting.join_requests || []).map(r => r.dept === dept ? { ...r, status: 'approved' } : r);
    const coDepts = [...(meeting.co_departments || []), dept];
    await updateMeeting(meetingId, { join_requests: reqs, co_departments: coDepts });
  };

  const rejectJoin = async (meetingId, dept) => {
    const meeting = allClientMeetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const reqs = (meeting.join_requests || []).map(r => r.dept === dept ? { ...r, status: 'rejected' } : r);
    await updateMeeting(meetingId, { join_requests: reqs });
  };

  const checkConflicts = (date) => {
    if (!date) return [];
    const day = new Date(date).toDateString();
    return allClientMeetings.filter(m => m.department !== department && new Date(m.scheduled_at).toDateString() === day);
  };

  return { meetings, allClientMeetings, loading, createMeeting, updateMeeting, deleteMeeting, requestJoin, approveJoin, rejectJoin, checkConflicts, refetch: fetchMeetings };
};
