"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  User,
  Settings,
  Upload,
  Send,
  Search,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Play,
  Award
} from 'lucide-react';

export default function Dashboard() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, jobs, cv, settings

  // Database States
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // idle, searching, success, error
  const [searchLogs, setSearchLogs] = useState([]);

  // CV Upload States
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvFeedback, setCvFeedback] = useState('');
  const fileInputRef = useRef(null);

  // Profile Form States
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');

  // Credentials / Settings States
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [targetEmail, setTargetEmail] = useState('');

  // Selected Job (for Drawer)
  const [selectedJob, setSelectedJob] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('description'); // description, evaluation, resumeSuggestions, coverLetter
  const [editedLetter, setEditedLetter] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, NEW, APPLIED, REJECTED

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch initial profile and jobs data
  useEffect(() => {
    fetchProfile();
    fetchJobs();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ text: message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        // Prefill form states
        setCandidateName(data.name || '');
        setCandidateEmail(data.email || '');
        setSearchKeywords(data.searchKeywords || '');
        setSearchLocation(data.location || '');
        setResumeText(data.resumeText || '');
        setResumeFileName(data.resumeFileName || '');
        setGeminiApiKey(data.geminiApiKey || '');
        setGmailUser(data.gmailUser || '');
        setGmailAppPassword(data.gmailAppPassword || '');
        setTargetEmail(data.targetEmail || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      showToast('Impossible de charger le profil utilisateur', 'error');
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      showToast('Impossible de charger les offres d\'emploi', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run Manual Search Task
  const triggerManualSearch = async () => {
    try {
      setSearchStatus('searching');
      showToast('Recherche en cours sur les sites d\'emploi...', 'info');
      const response = await fetch('/api/cron/search');
      const data = await response.json();

      if (data.success) {
        setSearchStatus('success');
        const summary = data.summary;
        const logMsg = `Recherche terminée le ${new Date().toLocaleTimeString()} : ${summary.totalScraped} trouvés, ${summary.added} ajoutés, ${summary.duplicates} doublons ignorés.`;
        setSearchLogs(prev => [logMsg, ...prev]);
        showToast(`Recherche terminée : +${summary.added} nouvelles offres !`, 'success');
        fetchJobs();
      } else {
        setSearchStatus('error');
        showToast(data.message || 'Erreur lors de la recherche.', 'error');
      }
    } catch (error) {
      setSearchStatus('error');
      console.error('Job search API error:', error);
      showToast('Erreur réseau lors de la recherche automatique.', 'error');
    }
  };

  // Save Profile Details
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        name: candidateName,
        email: candidateEmail,
        searchKeywords,
        location: searchLocation,
        resumeText,
        geminiApiKey,
        gmailUser,
        gmailAppPassword,
        targetEmail
      };

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('Profil enregistré avec succès !', 'success');
        fetchProfile();
      } else {
        const err = await response.json();
        showToast(err.error || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Erreur lors de l\'enregistrement du profil.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // File Upload Handlers
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCv(true);
    setCvFeedback('Upload et extraction du texte en cours...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setResumeFileName(data.fileName);
        setResumeText(data.profile.resumeText);
        showToast('CV importé et analysé avec succès !', 'success');
        setCvFeedback(`Fichier lu avec succès : ${data.fileName}`);
        fetchProfile();
      } else {
        const err = await response.json();
        showToast(err.error || 'Erreur lors du traitement du fichier.', 'error');
        setCvFeedback('Erreur lors de l\'analyse.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast('Erreur lors de la lecture du fichier.', 'error');
      setCvFeedback('Erreur serveur.');
    } finally {
      setUploadingCv(false);
    }
  };

  // Handle Job click -> open Side Drawer
  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setEditedLetter(job.customCoverLetter || '');
    setRecipientEmail(job.companyContactEmail || targetEmail || gmailUser || '');
    setDrawerTab('description');
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedJob(null);
  };

  // Drawer actions
  const handleUpdateJobStatus = async (jobId, status) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status })
      });

      if (response.ok) {
        showToast(`Statut mis à jour : ${status === 'APPLIED' ? 'Candidature envoyée' : status === 'REJECTED' ? 'Refusée' : 'Intéressé'}`, 'success');
        const updated = await response.json();
        
        // Update local jobs list
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
        
        // Update selected job if currently in drawer
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob(prev => ({ ...prev, status }));
        }
        
        if (status === 'REJECTED') {
          handleCloseDrawer();
        }
      }
    } catch (error) {
      console.error('Error updating job:', error);
      showToast('Impossible de modifier le statut.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateLetter = async (jobId) => {
    setActionLoading(true);
    showToast('Génération de la lettre personnalisée avec Gemini...', 'info');
    try {
      const response = await fetch('/api/jobs/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      if (response.ok) {
        const data = await response.json();
        setEditedLetter(data.letter);
        
        // Update in jobs list
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, customCoverLetter: data.letter } : j));
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob(prev => ({ ...prev, customCoverLetter: data.letter }));
        }
        showToast('Nouvelle lettre de motivation générée !', 'success');
      } else {
        const err = await response.json();
        showToast(err.error || 'Erreur lors de la génération.', 'error');
      }
    } catch (error) {
      console.error('Error regenerating letter:', error);
      showToast('Erreur réseau lors de la génération de la lettre.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendApplication = async (e) => {
    e.preventDefault();
    if (!recipientEmail) {
      showToast('Adresse email du destinataire requise pour envoyer.', 'error');
      return;
    }

    setActionLoading(true);
    showToast('Envoi de la candidature avec CV joint par Gmail SMTP...', 'info');
    try {
      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          recipientEmail: recipientEmail,
          coverLetterText: editedLetter
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast('Candidature envoyée avec succès par email !', 'success');
        
        // Update state
        setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, status: 'APPLIED', customCoverLetter: editedLetter } : j));
        setSelectedJob(prev => ({ ...prev, status: 'APPLIED', customCoverLetter: editedLetter }));
        
        // Switch to description or close
        handleCloseDrawer();
      } else {
        showToast(data.error || 'L\'envoi du mail a échoué.', 'error');
      }
    } catch (error) {
      console.error('Error sending application:', error);
      showToast('Erreur lors de l\'envoi du mail.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Voulez-vous supprimer définitivement cette offre ?')) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/jobs?id=${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Offre d\'emploi supprimée de l\'agent.', 'success');
        setJobs(prev => prev.filter(j => j.id !== jobId));
        handleCloseDrawer();
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      showToast('Erreur lors de la suppression de l\'offre.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for scoring badge
  const getScoreBadgeClass = (score) => {
    if (score >= 8) return 'rating-high';
    if (score >= 6) return 'rating-medium';
    if (score >= 4) return 'rating-low';
    return 'rating-poor';
  };

  // Helper for status classes
  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="status-badge status-new">Nouveau</span>;
      case 'APPLIED':
        return <span className="status-badge status-applied">Postulé</span>;
      case 'REJECTED':
        return <span className="status-badge status-rejected">Refusé</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  // Filter and Search calculations
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && job.status === statusFilter;
  });

  // KPI Metrics calculation
  const totalMatches = jobs.length;
  const appliedCount = jobs.filter(j => j.status === 'APPLIED').length;
  const highlyCompatible = jobs.filter(j => j.score >= 8).length;
  const pendingCount = jobs.filter(j => j.status === 'NEW').length;

  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className="glass-panel" 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            padding: '12px 24px',
            borderLeft: `4px solid ${toastMessage.type === 'error' ? 'var(--color-danger)' : toastMessage.type === 'info' ? 'var(--accent-blue)' : 'var(--color-success)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {toastMessage.type === 'error' ? (
            <XCircle className="icon" style={{ color: 'var(--color-danger)' }} size={20} />
          ) : toastMessage.type === 'info' ? (
            <RefreshCw className="icon pulse-loader-icon" style={{ color: 'var(--accent-blue)' }} size={20} />
          ) : (
            <CheckCircle className="icon" style={{ color: 'var(--color-success)' }} size={20} />
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toastMessage.text}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar glass-panel">
        <div className="brand-section">
          <div className="brand-icon">
            <Briefcase size={22} style={{ color: '#fff' }} />
          </div>
          <div className="brand-title">Job Hunter Agent</div>
        </div>

        <nav>
          <ul className="nav-list">
            <li className="nav-item">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              >
                <Award size={18} />
                Tableau de Bord
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveTab('jobs')}
                className={`nav-link ${activeTab === 'jobs' ? 'active' : ''}`}
              >
                <Briefcase size={18} />
                Offres & Matchs
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveTab('cv')}
                className={`nav-link ${activeTab === 'cv' ? 'active' : ''}`}
              >
                <User size={18} />
                Profil & CV
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveTab('settings')}
                className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
              >
                <Settings size={18} />
                Paramètres
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-info">
              <span className="user-name">{candidateName || 'Utilisateur'}</span>
              <span className="user-role">Agent Actif</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="page-header">
          <div className="header-title-section">
            <h1>Job Hunter Agent for {candidateName || 'Fany'}</h1>
            <p>Automatisation de recherche d'emploi intelligente et personnalisée.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={fetchJobs} 
              disabled={loading || searchStatus === 'searching'}
              style={{ padding: '0.65rem 0.85rem' }}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button 
              className="btn btn-primary" 
              onClick={triggerManualSearch}
              disabled={searchStatus === 'searching'}
            >
              <Play size={16} />
              Rechercher maintenant
            </button>
          </div>
        </header>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPI Cards Grid */}
            <div className="metrics-grid">
              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <span className="metric-title">Offres Découvertes</span>
                  <Briefcase className="metric-icon" size={16} />
                </div>
                <span className="metric-value">{totalMatches}</span>
                <span className="metric-footer">Total des opportunités scorées</span>
              </div>
              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <span className="metric-title">Haute Compatibilité</span>
                  <Award className="metric-icon" size={16} style={{ color: 'var(--color-success)' }} />
                </div>
                <span className="metric-value" style={{ color: 'var(--color-success)' }}>{highlyCompatible}</span>
                <span className="metric-footer">Note de correspondance ≥ 8 / 10</span>
              </div>
              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <span className="metric-title">En Attente</span>
                  <AlertTriangle className="metric-icon" size={16} style={{ color: 'var(--color-warning)' }} />
                </div>
                <span className="metric-value">{pendingCount}</span>
                <span className="metric-footer">Nouveaux matchs à examiner</span>
              </div>
              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <span className="metric-title">Candidatures Envoyées</span>
                  <Send className="metric-icon" size={16} style={{ color: 'var(--accent-blue)' }} />
                </div>
                <span className="metric-value">{appliedCount}</span>
                <span className="metric-footer">Envoyées via Gmail SMTP</span>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Left Column: Top Match Recommendations */}
              <div className="section-card glass-panel">
                <div className="section-header">
                  <h2 className="section-title">
                    <Award size={18} /> Recommandations les plus compatibles
                  </h2>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('jobs')}>
                    Voir tout
                  </button>
                </div>

                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="pulse-loader"></div>
                  </div>
                ) : jobs.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Briefcase size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>Aucun match trouvé pour le moment.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Lisez votre CV puis lancez une recherche.</p>
                  </div>
                ) : (
                  <div className="jobs-list">
                    {jobs
                      .filter(j => j.status === 'NEW')
                      .slice(0, 3)
                      .map(job => (
                        <div key={job.id} className="job-card glass-panel glass-panel-hover" onClick={() => handleJobSelect(job)}>
                          <div className={`rating-badge ${getScoreBadgeClass(job.score)}`}>
                            {job.score}
                          </div>
                          <div className="job-details-main">
                            <div className="job-title-row">
                              <span className="job-card-title">{job.title}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <span className="job-company">{job.company}</span>
                            <div className="job-meta-row">
                              <span className="job-meta-item">{job.source}</span>
                              <span>•</span>
                              <span className="job-meta-item">Créé le {new Date(job.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Right Column: Active Task Log */}
              <div className="section-card glass-panel">
                <div className="section-header">
                  <h2 className="section-title">
                    <Settings size={18} /> Logs de l'Agent Automatique
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, maxHeight: '350px', overflowY: 'auto' }}>
                  <div className="log-row">
                    <span className="log-time">CRON</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Prochaine recherche programmée (4x/jour)</span>
                    <span className="log-status-success">ACTIF</span>
                  </div>
                  
                  {searchStatus === 'searching' && (
                    <div className="log-row" style={{ borderColor: 'var(--accent-blue)' }}>
                      <span className="log-time">Maintenant</span>
                      <span style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Recherche en cours...
                      </span>
                    </div>
                  )}

                  {searchLogs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Aucun historique de recherche sur cette session.
                    </div>
                  ) : (
                    searchLogs.map((log, index) => (
                      <div key={index} className="log-row">
                        <span className="log-time">Session</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Job Search & Matches list */}
        {activeTab === 'jobs' && (
          <div className="section-card glass-panel">
            <div className="section-header" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 1 }}>
                <h2 className="section-title">Offres Découvertes ({filteredJobs.length})</h2>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px', border: 'var(--glass-border)' }}>
                  <button 
                    className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none', boxShadow: 'none' }}
                    onClick={() => setStatusFilter('ALL')}
                  >
                    Toutes
                  </button>
                  <button 
                    className={`btn ${statusFilter === 'NEW' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none', boxShadow: 'none' }}
                    onClick={() => setStatusFilter('NEW')}
                  >
                    Nouvelles
                  </button>
                  <button 
                    className={`btn ${statusFilter === 'APPLIED' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none', boxShadow: 'none' }}
                    onClick={() => setStatusFilter('APPLIED')}
                  >
                    Postulées
                  </button>
                  <button 
                    className={`btn ${statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none', boxShadow: 'none' }}
                    onClick={() => setStatusFilter('REJECTED')}
                  >
                    Refusées
                  </button>
                </div>
              </div>

              {/* Search Bar input */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  placeholder="Rechercher poste, entreprise..."
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                <div className="pulse-loader"></div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Search size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>Aucune offre ne correspond à vos filtres actuels.</p>
              </div>
            ) : (
              <div className="jobs-list">
                {filteredJobs.map(job => (
                  <div key={job.id} className="job-card glass-panel glass-panel-hover" onClick={() => handleJobSelect(job)}>
                    <div className={`rating-badge ${getScoreBadgeClass(job.score)}`}>
                      {job.score}
                    </div>
                    
                    <div className="job-details-main">
                      <div className="job-title-row">
                        <span className="job-card-title">{job.title}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <span className="job-company">{job.company}</span>
                      <div className="job-meta-row">
                        <span className="job-meta-item">{job.source}</span>
                        <span>•</span>
                        <span className="job-meta-item">Découvert le {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="job-actions-right">
                      <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Profile & CV parser config */}
        {activeTab === 'cv' && (
          <div className="section-card glass-panel">
            <div className="section-header">
              <h2 className="section-title">
                <User size={18} /> Profil & Informations Candidat
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ces données guident l'algorithme de ciblage de l'agent et s'insèrent dans les lettres de motivation.</p>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Nom Complet</label>
                  <input 
                    id="name"
                    type="text"
                    className="form-input"
                    placeholder="Votre Nom et Prénom"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email de Contact</label>
                  <input 
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="candidat@email.com"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="keywords">Mots-clés de recherche (séparés par des virgules)</label>
                  <input 
                    id="keywords"
                    type="text"
                    className="form-input"
                    placeholder="Développeur React, Chef de Projet, Node.js"
                    value={searchKeywords}
                    onChange={(e) => setSearchKeywords(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="location">Localisation souhaitée</label>
                  <input 
                    id="location"
                    type="text"
                    className="form-input"
                    placeholder="Télétravail, Paris, Lyon"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <label>Votre CV (PDF, Word ou TXT)</label>
                
                {/* Drag-drop or click area */}
                <input 
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                />
                
                <div 
                  className={`upload-dropzone ${uploadingCv ? 'dragging' : ''}`}
                  onClick={triggerFileInput}
                  style={{ pointerEvents: uploadingCv ? 'none' : 'auto' }}
                >
                  <Upload className="upload-icon" size={32} />
                  {uploadingCv ? (
                    <span style={{ color: 'var(--accent-purple)' }}>Traitement du document en cours...</span>
                  ) : (
                    <>
                      <span>Glissez-déposez votre CV ici ou <strong>cliquez pour parcourir</strong></span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format accepté : PDF, Word (.docx), Fichier texte</span>
                    </>
                  )}
                </div>

                {cvFeedback && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    {cvFeedback}
                  </div>
                )}

                {resumeFileName && (
                  <div className="file-preview" style={{ marginTop: '0.5rem' }}>
                    <div className="file-info">
                      <FileText size={16} style={{ color: 'var(--accent-purple)' }} />
                      <span>{resumeFileName}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>CV importé et lu</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="cvText">Contenu brut du CV (extrait)</label>
                <textarea 
                  id="cvText"
                  className="form-input"
                  placeholder="Le texte extrait de votre document apparaîtra ici. Vous pouvez également copier-coller votre CV manuellement."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Enregistrement...' : 'Enregistrer le Profil & CV'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Settings config (Keys and Cron Details) */}
        {activeTab === 'settings' && (
          <div className="section-card glass-panel">
            <div className="section-header">
              <h2 className="section-title">
                <Settings size={18} /> Paramètres API & Messagerie Gmail
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Configurez vos clés et comptes Gmail. Les mots de passe sont stockés de manière sécurisée en local.</p>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="geminiKey">Clé API Google Gemini</label>
                <input 
                  id="geminiKey"
                  type="password"
                  className="form-input"
                  placeholder={geminiApiKey ? '********' : 'Collez votre clé API Gemini (AI Studio)'}
                  value={geminiApiKey === '********' ? '********' : geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Requis pour l'analyse de compatibilité intelligente, la génération de lettres et les optimisations de CV.
                </span>
              </div>

              <div className="form-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <div className="form-group">
                  <label htmlFor="gmailUser">Compte Gmail SMTP (Expéditeur)</label>
                  <input 
                    id="gmailUser"
                    type="email"
                    className="form-input"
                    placeholder="votre.adresse@gmail.com"
                    value={gmailUser}
                    onChange={(e) => setGmailUser(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    L'adresse Gmail utilisée pour envoyer vos candidatures de façon automatisée.
                  </span>
                </div>
                <div className="form-group">
                  <label htmlFor="gmailPass">Mot de passe d'application Gmail</label>
                  <input 
                    id="gmailPass"
                    type="password"
                    className="form-input"
                    placeholder={gmailAppPassword ? '********' : 'Entrez votre mot de passe d\'application Google'}
                    value={gmailAppPassword === '********' ? '********' : gmailAppPassword}
                    onChange={(e) => setGmailAppPassword(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ce n'est PAS votre mot de passe principal. Vous devez le générer sur votre compte Google (Sécurité &gt; Mots de passe d'application).
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="targetMail">Email de destination de Test</label>
                <input 
                  id="targetMail"
                  type="email"
                  className="form-input"
                  placeholder="votre.test@email.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Par défaut, les emails de candidatures seront envoyés à cet email si l'offre n'a pas d'adresse directe configurée. Laissez vide pour vous envoyer des emails à vous-même (mode test).
                </span>
              </div>

              <div 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem', 
                  border: 'var(--glass-border-glow)', 
                  background: 'rgba(138, 43, 226, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={16} style={{ color: 'var(--accent-purple)' }} /> Planificateur de Tâches Automatique
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Le robot est paramétré pour rechercher de nouvelles opportunités <strong>4 fois par jour</strong> (toutes les 6 heures) sur les sites d'emploi ciblés. 
                  Dès qu'un nouveau poste correspondant à vos mots-clés est publié, il est extrait, noté par l'IA et rendu disponible dans votre espace de travail.
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Endpoint automatisé Vercel Cron : <code>/api/cron/search</code>
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Enregistrement...' : 'Sauvegarder les Paramètres API'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Slide drawer for Job Details, compatibility evaluation, cover letter and sending */}
      <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={handleCloseDrawer}>
        <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
          {selectedJob && (
            <>
              {/* Drawer Header */}
              <div className="drawer-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span className={`rating-badge ${getScoreBadgeClass(selectedJob.score)}`} style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}>
                      {selectedJob.score}
                    </span>
                    <span className="drawer-title">{selectedJob.title}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>
                    {selectedJob.company}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                    Source: {selectedJob.source}
                  </span>
                </div>
                <button 
                  className="btn btn-secondary btn-icon-only" 
                  onClick={handleCloseDrawer}
                  style={{ border: 'none', background: 'none' }}
                >
                  <XCircle size={22} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              {/* Drawer Tabs Body */}
              <div className="drawer-body">
                {/* Horizontal tabs */}
                <div className="tabs-container">
                  <div className="tabs-header">
                    <button 
                      className={`tab-btn ${drawerTab === 'description' ? 'active' : ''}`}
                      onClick={() => setDrawerTab('description')}
                    >
                      Description
                    </button>
                    <button 
                      className={`tab-btn ${drawerTab === 'evaluation' ? 'active' : ''}`}
                      onClick={() => setDrawerTab('evaluation')}
                    >
                      Compatibilité
                    </button>
                    <button 
                      className={`tab-btn ${drawerTab === 'resumeSuggestions' ? 'active' : ''}`}
                      onClick={() => setDrawerTab('resumeSuggestions')}
                    >
                      Suggestions CV
                    </button>
                    <button 
                      className={`tab-btn ${drawerTab === 'coverLetter' ? 'active' : ''}`}
                      onClick={() => setDrawerTab('coverLetter')}
                    >
                      Lettre & Envoi
                    </button>
                  </div>

                  {/* Tab contents */}
                  <div className="tab-content">
                    {drawerTab === 'description' && (
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                          <a 
                            href={selectedJob.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-secondary" 
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                          >
                            <ExternalLink size={14} /> Voir l'offre d'origine
                          </a>
                        </div>
                        {selectedJob.description}
                      </div>
                    )}

                    {drawerTab === 'evaluation' && (
                      <div className="bullet-list-style">
                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Analyse de compatibilité par l'IA</h4>
                        <div dangerouslySetInnerHTML={{ __html: selectedJob.compatibilityReason }} />
                      </div>
                    )}

                    {drawerTab === 'resumeSuggestions' && (
                      <div className="bullet-list-style">
                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Adaptation de CV proposée</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                          Voici des pistes concrètes pour optimiser votre CV par rapport aux exigences du poste :
                        </p>
                        <div dangerouslySetInnerHTML={{ __html: selectedJob.suggestedResumeChanges }} />
                      </div>
                    )}

                    {drawerTab === 'coverLetter' && (
                      <div style={{ display: 'flex', flexType: 'column', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '1rem' }}>Lettre de Motivation Personnalisée</h4>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleRegenerateLetter(selectedJob.id)}
                            disabled={actionLoading}
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                          >
                            <RefreshCw size={14} className={actionLoading ? 'spin' : ''} /> Régénérer la lettre
                          </button>
                        </div>

                        <textarea 
                          className="form-input"
                          style={{ minHeight: '260px', fontSize: '0.85rem', fontFamily: 'sans-serif', lineHeight: 1.5 }}
                          value={editedLetter}
                          onChange={(e) => setEditedLetter(e.target.value)}
                        />

                        {/* Send form */}
                        <form onSubmit={handleSendApplication} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className="form-group">
                            <label htmlFor="recipientEmail">Adresse Email du Recruteur</label>
                            <input 
                              id="recipientEmail"
                              type="email"
                              className="form-input"
                              placeholder="recrutement@entreprise.com ou email de test"
                              value={recipientEmail}
                              onChange={(e) => setRecipientEmail(e.target.value)}
                              required
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Le CV principal de votre profil sera joint automatiquement au format PDF/Word à cet email.
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={actionLoading || selectedJob.status === 'APPLIED'}>
                              <Send size={16} /> 
                              {selectedJob.status === 'APPLIED' ? 'Candidature Déjà Envoyée' : 'Envoyer la Candidature par Gmail'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="drawer-footer">
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteJob(selectedJob.id)}
                  disabled={actionLoading}
                  style={{ marginRight: 'auto' }}
                >
                  <Trash2 size={16} /> Supprimer
                </button>

                {selectedJob.status !== 'REJECTED' && (
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleUpdateJobStatus(selectedJob.id, 'REJECTED')}
                    disabled={actionLoading}
                  >
                    <XCircle size={16} /> Refuser l'offre
                  </button>
                )}

                {selectedJob.status !== 'APPLIED' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setDrawerTab('coverLetter');
                    }}
                  >
                    Postuler maintenant
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
