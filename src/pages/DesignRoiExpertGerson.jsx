import { useState } from 'react';
import { Calendar, Video, BookOpen, UserCircle, MessageSquare, Plus, X, Loader2 } from 'lucide-react';
import ClientFolderManager from '../components/ClientFolderManager';
import FeedbackField from '../components/FeedbackField';
import { useDepartmentTasks } from '../hooks/useDepartmentTasks';
import { supabase } from '../lib/supabase';

const SocialMediaContent = ({ client }) => {
    const { tasks, loading, addTask, updateTask, deleteTask } = useDepartmentTasks(client.id, 'Social Media');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const handleDirectDelete = async (id) => {
      setDeletingId(id);
      try {
        const { error } = await supabase.from('department_tasks').delete().eq('id', id);
        if (error) throw error;
        deleteTask(id);
        setConfirmDeleteId(null);
      } catch (err) {
        alert('Erro ao excluir: ' + err.message);
      } finally {
        setDeletingId(null);
      }
    };

    // Separando os tipos de tarefas para exibir nos módulos corretos
    const posts = tasks.filter(t => t.metadata?.type === 'post');
    const videos = tasks.filter(t => t.metadata?.type === 'video');

    const handleAddPost = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        await addTask({ title: newTaskTitle, status: 'A Fazer', metadata: { type: 'post' } });
        setNewTaskTitle('');
    };

    const handleAddVideo = async (e) => {
        e.preventDefault();
        if (!newVideoTitle.trim()) return;
        await addTask({ title: newVideoTitle, status: 'Em Andamento', metadata: { type: 'video' } });
        setNewVideoTitle('');
    };

    const cycleStatus = async (task) => {
        const statusFlow = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Aprovado', 'Refazer', 'Concluído'];
        let nextIndex = (statusFlow.indexOf(task.status) + 1) % statusFlow.length;
        await updateTask(task.id, { status: statusFlow[nextIndex] });
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Aprovado': case 'Concluído': return '✅';
            case 'Refazer': return '❌';
            case 'Em Andamento': case 'Em Revisão': return '⏳';
            default: return '📌';
        }
    };

    return (
        <>


            <div className="dept-grid">
                <section className="glass-panel col-span-2">
                    <div className="section-title">
                        <Calendar size={20} /> Calendário de Postagem Dinâmico
                    </div>
                    <div className="mock-calendar">
                        <div className="calendar-day">Seg<br />12<div className="dot" style={{ background: 'var(--border-color)' }}></div></div>
                        <div className="calendar-day">Ter<br />13</div>
                        <div className="calendar-day active">Qua<br />14<div className="dot"></div></div>
                        <div className="calendar-day">Qui<br />15</div>
                        <div className="calendar-day">Sex<br />16<div className="dot"></div></div>
                        <div className="calendar-day">Sáb<br />17</div>
                        <div className="calendar-day">Dom<br />18</div>
                    </div>

                    <form onSubmit={handleAddPost} className="add-task-form">
                        <input
                            type="text"
                            placeholder="Novo post para o carrossel (Aperte Enter)..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="glass-input"
                        />
                        <button type="submit" disabled={!newTaskTitle.trim()} className="glass-btn primary"><Plus size={16} /></button>
                    </form>

                    {loading ? (
                        <div className="loading-state"><Loader2 className="spin" /> Carregando publicações...</div>
                    ) : (
                        <div className="post-list">
                            {posts.length === 0 && <p className="text-muted text-sm">Nenhuma postagem cadastrada ainda.</p>}
                            {posts.map(post => (
                                <div key={post.id} className="post-item glass-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <span className="badge bg-instagram">Instagram</span>
                                            <h4>{post.title}</h4>
                                            <p style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => cycleStatus(post)}>
                                                Status: <b>{post.status}</b> (Clique para alterar)
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          {confirmDeleteId === post.id ? (
                                            <>
                                              <button onClick={() => handleDirectDelete(post.id)} disabled={deletingId === post.id} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                                {deletingId === post.id ? '...' : 'Sim'}
                                              </button>
                                              <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>Não</button>
                                            </>
                                          ) : (
                                            <button onClick={() => setConfirmDeleteId(post.id)} className="icon-btn text-muted"><X size={16} /></button>
                                          )}
                                        </div>
                                    </div>

                                    <FeedbackField
                                        initialFeedback={post.feedback}
                                        onSubmit={(feedback) => updateTask(post.id, { feedback })}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <section className="glass-panel">
                        <div className="section-title">
                            <BookOpen size={20} /> Estratégia
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.9rem' }}>O foco de <b>{client.name}</b> é autoridade em topo de funil utilizando vídeos curtos nos reels interagindo com o banco dinâmico.</p>
                    </section>

                    <section className="glass-panel" style={{ flex: 1 }}>
                        <div className="section-title">
                            <Video size={20} /> Gaveta de Vídeos
                        </div>

                        <form onSubmit={handleAddVideo} className="add-task-form" style={{ marginBottom: 16 }}>
                            <input
                                type="text"
                                placeholder="Adicionar roteiro de vídeo..."
                                value={newVideoTitle}
                                onChange={(e) => setNewVideoTitle(e.target.value)}
                                className="glass-input"
                            />
                        </form>

                        {loading ? (
                            <div className="loading-state"><Loader2 className="spin" /> Carregando vídeos...</div>
                        ) : (
                            <ul className="video-list">
                                {videos.length === 0 && <li style={{ textAlign: 'center', opacity: 0.5 }}>Sem vídeos na gaveta.</li>}
                                {videos.map(video => (
                                    <li key={video.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span onClick={() => cycleStatus(video)} style={{ cursor: 'pointer' }}>
                                                {getStatusIcon(video.status)} {video.title} - <b>{video.status}</b>
                                            </span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                              {confirmDeleteId === video.id ? (
                                                <>
                                                  <button onClick={() => handleDirectDelete(video.id)} disabled={deletingId === video.id} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                                    {deletingId === video.id ? '...' : 'Sim'}
                                                  </button>
                                                  <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>Não</button>
                                                </>
                                              ) : (
                                                <X size={14} className="text-muted" style={{ cursor: 'pointer' }} onClick={() => setConfirmDeleteId(video.id)} />
                                              )}
                                            </div>
                                        </div>
                                        <FeedbackField
                                            initialFeedback={video.feedback}
                                            onSubmit={(feedback) => updateTask(video.id, { feedback })}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
};

const SocialMedia = () => {
    return (
        <ClientFolderManager title="Social Media" description="Acompanhe o Calendário de Postagem, Estratégia de Conteúdo e Gaveta de Vídeos sincrônicos com o BD.">
            {(client) => (
                <>
                    <SocialMediaContent client={client} />

                    <style>{`
            .dept-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 16px; }
            .dept-header h1 { font-size: 1.4rem; margin-bottom: 4px; color: var(--text-main); }
            .text-primary { color: var(--primary); }
            .text-muted { color: var(--text-muted); }
            .contact-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; margin-bottom: 16px;}
            .contact-info { display: flex; align-items: center; gap: 12px; }
            .contact-info h3 { margin: 0; font-size: 1rem; }
            .contact-info p { margin: 0; font-size: 0.8rem; }
            .glass-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; font-size:0.85rem;}
            .glass-btn.primary { background: var(--primary); border-color: transparent; }
            .glass-btn:hover { background: rgba(99, 102, 241, 0.4); border-color: var(--primary); }
            .glass-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .glass-input { flex: 1; min-width: 0; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); color: white; padding: 8px 12px; border-radius: 8px; outline: none; font-size:0.85rem;}
            .glass-input:focus { border-color: var(--primary); }
            .add-task-form { display: flex; gap: 8px; margin-bottom: 16px; }
            .dept-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .col-span-2 { grid-column: span 2; }
            .dept-grid section { padding: 16px; }
            .section-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
            .mock-calendar { display: flex; gap: 8px; margin-bottom: 16px; }
            .calendar-day { flex: 1; padding: 8px; text-align: center; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 500; position: relative; }
            .calendar-day.active { border-color: var(--primary); background: rgba(99, 102, 241, 0.2); }
            .dot { width: 6px; height: 6px; background: var(--secondary); border-radius: 50%; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); }
            .post-list { display: flex; flex-direction: column; gap: 12px; }
            .post-item { padding: 12px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-bottom: 6px; }
            .bg-instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: white; }
            .video-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; }
            .video-list li { padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid transparent; transition: 0.2s;}
            .video-list li:hover { border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); }
            .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; }
            .icon-btn:hover { background: rgba(255,0,0,0.1); color: #ff4444; }
            .spin { animation: spin 1s linear infinite; }
            .loading-state { display: flex; align-items: center; gap: 8px; color: var(--text-muted); padding: 20px; justify-content: center;}
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}</style>
                </>
            )}
        </ClientFolderManager>
    );
};
export default SocialMedia;
