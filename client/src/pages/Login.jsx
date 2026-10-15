import React, { useState } from 'react';
import { api } from '../services/api';

export default function Login({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', branch: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const endpoint = register ? '/auth/register' : '/auth/login';
      const data = await api(endpoint, 'POST', f);
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>SkillBridge</h1>
        <p className="muted">Student Skill Development and Placement Management</p>
        
        {register && (
          <input
            placeholder="Full name"
            value={f.name}
            onChange={set('name')}
            required
          />
        )}
        
        <input
          type="email"
          placeholder="Email address"
          value={f.email}
          onChange={set('email')}
          required
        />
        
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={f.password}
          onChange={set('password')}
          required
        />
        
        {register && (
          <input
            placeholder="Branch (e.g. AI & DS, CSE, IT)"
            value={f.branch}
            onChange={set('branch')}
          />
        )}
        
        {err && <p className="err">{err}</p>}
        
        <button className="primary" disabled={loading}>
          {loading ? 'Please wait…' : register ? 'Create account' : 'Log in'}
        </button>
        
        <p
          className="muted link"
          onClick={() => {
            setRegister(!register);
            setErr('');
          }}
        >
          {register
            ? 'Already have an account? Log in'
            : 'New student? Register here'}
        </p>
      </form>
    </div>
  );
}
