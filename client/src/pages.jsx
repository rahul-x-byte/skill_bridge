import { useEffect, useState } from 'react';
import { api } from './api';

const Bar = ({ label, value, suffix = '', max = 100 }) => (
  <div className="bar">
    <div className="t"><span>{label}</span><span>{value}{suffix}</span></div>
    <div className="track"><div className="fill" style={{ width: Math.min(100, (value / max) * 100) + '%' }} /></div>
  </div>
);
const Stat = ({ label, value }) => <div className="card stat"><span className="muted">{label}</span><strong>{value}</strong></div>;

/* ---------------- Dashboard: profile + skills ---------------- */
export function Dashboard({ user, setUser }) {
  const [f, setF] = useState({ name: user.name, branch: user.branch || '', cgpa: user.cgpa ?? '' });
  const [skill, setSkill] = useState({ name: '', level: 50 });
  const [msg, setMsg] = useState('');

  const save = async (e) => { e.preventDefault(); setUser(await api('/me', 'PUT', f)); setMsg('Profile saved'); };
  const addSkill = async (e) => {
    e.preventDefault();
    if (!skill.name.trim()) return;
    setUser(await api('/me/skills', 'POST', skill)); setSkill({ name: '', level: 50 });
  };
  const removeSkill = async (name) => setUser(await api('/me/skills/' + encodeURIComponent(name), 'DELETE'));

  return (
    <>
      <h1>Welcome, {user.name}</h1>
      <p className="muted">{user.role === 'admin' ? 'Manage opportunities from the Placement Portal.' : 'Manage your profile and track your technical skills.'}</p>
      <div className="grid2">
        <form className="card" onSubmit={save}>
          <h3>Profile</h3>
          <label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <label>Branch</label><input value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })} />
          <label>CGPA</label><input type="number" step="0.01" min="0" max="10" value={f.cgpa} onChange={(e) => setF({ ...f, cgpa: e.target.value })} />
          <button className="primary">Save profile</button> <span className="ok">{msg}</span>
        </form>
        {user.role === 'student' && (
          <div className="card">
            <h3>My skills</h3>
            {user.skills.length ? user.skills.map((s) => (
              <div key={s.name} className="skillrow"><Bar label={s.name} value={s.level} suffix="%" />
                <button className="x" onClick={() => removeSkill(s.name)} title="Remove">✕</button></div>
            )) : <p className="muted">No skills yet. Add one or take an assessment.</p>}
            <form className="inline" onSubmit={addSkill}>
              <input placeholder="Skill (e.g. Node.js)" value={skill.name} onChange={(e) => setSkill({ ...skill, name: e.target.value })} />
              <input type="number" min="0" max="100" value={skill.level} onChange={(e) => setSkill({ ...skill, level: e.target.value })} style={{ width: 80 }} />
              <button className="primary">Add</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Skill assessment ---------------- */
export function Skills({ refresh }) {
  const [list, setList] = useState([]);
  const [hist, setHist] = useState([]);
  const [skill, setSkill] = useState(null);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState([]);
  const [res, setRes] = useState(null);

  const load = () => { api('/assessments/skills').then(setList); api('/assessments').then(setHist); };
  useEffect(load, []);

  const start = async (s) => { setSkill(s); setRes(null); const q = await api('/assessments/questions/' + s); setQs(q); setAns(Array(q.length).fill(-1)); };
  const submit = async () => { setRes(await api('/assessments/' + skill, 'POST', { answers: ans })); load(); refresh(); };

  return (
    <>
      <h1>Skill Assessment</h1>
      <p className="muted">Take a short quiz. Your score updates the skill level on your profile.</p>
      <div className="row">{list.map((s) => <button key={s} className={skill === s ? 'primary' : 'ghost'} onClick={() => start(s)}>{s}</button>)}</div>
      {skill && (
        <div className="card">
          <h3>{skill} quiz</h3>
          {qs.map((q, i) => (
            <div key={i} className="q"><b>{i + 1}. {q.q}</b>
              {q.o.map((o, j) => (
                <label key={j} className="opt"><input type="radio" name={'q' + i} checked={ans[i] === j} disabled={!!res}
                  onChange={() => setAns(ans.map((a, k) => (k === i ? j : a)))} /> {o}</label>
              ))}
            </div>
          ))}
          {res ? <p className="ok">Score: {res.score}/{res.total} — skill level set to {res.level}%</p>
               : <button className="primary" disabled={ans.includes(-1)} onClick={submit}>Submit answers</button>}
        </div>
      )}
      <div className="card"><h3>Recent attempts</h3>
        {hist.length ? <table><thead><tr><th>Skill</th><th>Score</th><th>Date</th></tr></thead><tbody>
          {hist.map((h) => <tr key={h._id}><td>{h.skill}</td><td>{h.score}/{h.total}</td><td>{new Date(h.createdAt).toLocaleDateString()}</td></tr>)}
        </tbody></table> : <p className="muted">No attempts yet.</p>}
      </div>
    </>
  );
}

/* ---------------- Placement portal ---------------- */
export function Jobs({ user }) {
  const admin = user.role === 'admin';
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [msg, setMsg] = useState('');
  const blank = { title: '', company: '', type: 'Placement', location: '', skills: '', minCgpa: '', deadline: '', description: '' };
  const [f, setF] = useState(blank);

  const load = () => {
    api('/jobs').then(setJobs);
    api(admin ? '/applications' : '/applications/mine').then(setApps);
  };
  useEffect(load, []);

  const apply = async (id) => { try { await api(`/jobs/${id}/apply`, 'POST'); setMsg('Application submitted'); load(); } catch (e) { setMsg(e.message); } };
  const post = async (e) => { e.preventDefault(); await api('/jobs', 'POST', f); setF(blank); load(); };
  const del = async (id) => { if (confirm('Delete this opportunity?')) { await api('/jobs/' + id, 'DELETE'); load(); } };
  const setStatus = async (id, status) => { await api('/applications/' + id, 'PUT', { status }); load(); };

  const mine = (id) => apps.find((a) => (a.job?._id || a.job) === id);
  const match = (j) => {
    if (!j.skills.length) return null;
    const have = user.skills.filter((s) => s.level >= 50).map((s) => s.name.toLowerCase());
    return Math.round((j.skills.filter((s) => have.includes(s.toLowerCase())).length / j.skills.length) * 100);
  };

  return (
    <>
      <h1>{admin ? 'Placement Portal' : 'Jobs & Internships'}</h1>
      {msg && <p className="ok">{msg}</p>}
      {admin && (
        <form className="card" onSubmit={post}>
          <h3>Post an opportunity</h3>
          <div className="grid3">
            <input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
            <input placeholder="Company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} required />
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option>Placement</option><option>Internship</option></select>
            <input placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
            <input placeholder="Skills (comma separated)" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} />
            <input type="number" step="0.1" placeholder="Min CGPA" value={f.minCgpa} onChange={(e) => setF({ ...f, minCgpa: e.target.value })} />
            <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          </div>
          <input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <button className="primary">Post</button>
        </form>
      )}
      <div className="grid2">
        {jobs.map((j) => {
          const a = mine(j._id), m = !admin && match(j);
          return (
            <div key={j._id} className="card">
              <span className={'tag ' + j.type}>{j.type}</span>
              <h3>{j.title}</h3>
              <p className="muted">{j.company} · {j.location || 'Anywhere'} · Min CGPA {j.minCgpa || 0}</p>
              <p>{j.description}</p>
              <p>{j.skills.map((s) => <span key={s} className="chip">{s}</span>)}</p>
              {j.deadline && <p className="muted small">Deadline: {new Date(j.deadline).toLocaleDateString()}</p>}
              {m !== false && m !== null && <p className="small">Skill match: <b>{m}%</b></p>}
              {admin ? <button className="ghost" onClick={() => del(j._id)}>Delete</button>
                : a ? <span className="chip on">{a.status}</span>
                : <button className="primary" onClick={() => apply(j._id)}>Apply</button>}
            </div>
          );
        })}
      </div>
      {admin && (
        <div className="card"><h3>Applications</h3>
          {apps.length ? <table><thead><tr><th>Student</th><th>CGPA</th><th>Job</th><th>Status</th></tr></thead><tbody>
            {apps.map((a) => <tr key={a._id}><td>{a.user?.name}<br /><span className="muted small">{a.user?.email}</span></td><td>{a.user?.cgpa ?? '-'}</td>
              <td>{a.job?.title} · {a.job?.company}</td>
              <td><select value={a.status} onChange={(e) => setStatus(a._id, e.target.value)}>
                {['Applied', 'Shortlisted', 'Selected', 'Rejected'].map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}
          </tbody></table> : <p className="muted">No applications yet.</p>}
        </div>
      )}
    </>
  );
}

/* ---------------- Learning roadmap ---------------- */
const ROADMAPS = {
  'Full-Stack Developer': ['HTML, CSS and responsive layout', 'JavaScript fundamentals', 'Git and GitHub', 'React basics and hooks', 'Node.js and Express REST APIs', 'MongoDB and Mongoose', 'Authentication with JWT', 'Deploy a full-stack project'],
  'Data Analyst': ['Excel and statistics basics', 'Python fundamentals', 'Pandas and NumPy', 'SQL queries and joins', 'Data visualization', 'Dashboards (Power BI / Tableau)', 'Capstone analysis project'],
  'AI / ML Engineer': ['Python and math basics', 'Data preprocessing', 'Supervised learning with scikit-learn', 'Neural networks basics', 'Deep learning (PyTorch / TensorFlow)', 'Model deployment', 'End-to-end ML project']
};

export function Roadmap({ user, setUser }) {
  const [track, setTrack] = useState(Object.keys(ROADMAPS)[0]);
  const id = (i) => `${track}:${i}`;
  const steps = ROADMAPS[track];
  const done = steps.filter((_, i) => user.progress.includes(id(i))).length;

  const toggle = async (i) => {
    const next = user.progress.includes(id(i)) ? user.progress.filter((p) => p !== id(i)) : [...user.progress, id(i)];
    setUser(await api('/me/progress', 'PUT', { progress: next }));
  };

  return (
    <>
      <h1>Learning Roadmap</h1>
      <div className="row">{Object.keys(ROADMAPS).map((t) => <button key={t} className={track === t ? 'primary' : 'ghost'} onClick={() => setTrack(t)}>{t}</button>)}</div>
      <div className="card">
        <Bar label="Progress" value={Math.round((done / steps.length) * 100)} suffix="%" />
        {steps.map((s, i) => (
          <label key={i} className="opt"><input type="checkbox" checked={user.progress.includes(id(i))} onChange={() => toggle(i)} /> {i + 1}. {s}</label>
        ))}
      </div>
    </>
  );
}

/* ---------------- Analytics ---------------- */
export function Analytics() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/analytics').then(setD); }, []);
  if (!d) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Analytics</h1>
      {d.role === 'admin' ? (
        <>
          <div className="grid3"><Stat label="Students" value={d.students} /><Stat label="Opportunities" value={d.jobs} /><Stat label="Applications" value={d.applications} /></div>
          <div className="grid2">
            <div className="card"><h3>Applications by status</h3>{d.byStatus.length ? d.byStatus.map((x) => <Bar key={x.label} label={x.label} value={x.value} max={Math.max(...d.byStatus.map((y) => y.value))} />) : <p className="muted">No data yet.</p>}</div>
            <div className="card"><h3>Average assessment score by skill</h3>{d.avgBySkill.length ? d.avgBySkill.map((x) => <Bar key={x.label} label={`${x.label} (${x.attempts} attempts)`} value={x.value} suffix="%" />) : <p className="muted">No data yet.</p>}</div>
          </div>
        </>
      ) : (
        <>
          <div className="grid3"><Stat label="Assessments taken" value={d.assessments} /><Stat label="Applications" value={d.applications} /><Stat label="Selected" value={d.selected} /></div>
          <div className="card"><h3>My skill levels</h3>{d.skills.length ? d.skills.map((x) => <Bar key={x.label} label={x.label} value={x.value} suffix="%" />) : <p className="muted">Add skills or take an assessment.</p>}</div>
          <p className="muted">Roadmap steps completed: {d.roadmapDone}</p>
        </>
      )}
    </>
  );
}
