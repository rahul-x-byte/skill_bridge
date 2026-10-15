import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './services/api';
import Login from './pages/Login';
import { Analytics, Dashboard, Jobs, Roadmap, Skills } from './pages.jsx';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api('/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refresh = () => api('/me').then(setUser);

  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <Login onLogin={setUser} />;

  const admin = user.role === 'admin';

  return (
    <div className="shell">
      <aside>
        <h2>SkillBridge</h2>
        <p className="muted small">
          {user.name} · {admin ? 'Placement Officer' : 'Student'}
        </p>
        <nav>
          <NavLink to="/">📊 Dashboard</NavLink>
          {!admin && <NavLink to="/skills">🧠 Skill Assessment</NavLink>}
          <NavLink to="/jobs">💼 {admin ? 'Placement Portal' : 'Jobs & Internships'}</NavLink>
          {!admin && <NavLink to="/roadmap">🗺 Learning Roadmap</NavLink>}
          <NavLink to="/analytics">📈 Analytics</NavLink>
        </nav>
        <button className="ghost" onClick={logout}>Log out</button>
      </aside>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard user={user} setUser={setUser} />} />
          <Route path="/skills" element={<Skills refresh={refresh} />} />
          <Route path="/jobs" element={<Jobs user={user} />} />
          <Route path="/roadmap" element={<Roadmap user={user} setUser={setUser} />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
