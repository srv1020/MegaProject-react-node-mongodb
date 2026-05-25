import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes('/login')
    ) {
      localStorage.clear();
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

const App = () => {
  const [state, setState] = useState({
    isAuthenticated: false,
    currentUser: null,
    users: [],
    form: {
      username: '',
      password: ''
    },
    error: '',
    success: '',
    loading: false,
    isLogin: true,
    checkingBackend: true,
    backendError: null
  });

  useEffect(() => {
    const checkBackend = async (retryCount = 0) => {
      try {
        const { data } = await API.get('/healthz');

        if (data.status === 'ok') {
          setState(prev => ({
            ...prev,
            checkingBackend: false,
            backendError: null
          }));
        }
      } catch (error) {
        if (retryCount < 2) {
          setTimeout(() => checkBackend(retryCount + 1), 2000);
          return;
        }

        setState(prev => ({
          ...prev,
          checkingBackend: false,
          backendError:
            error.response?.data?.error ||
            'Backend service unavailable'
        }));
      }
    };

    checkBackend();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (token && user) {
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        currentUser: user
      }));
    }
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await API.get('/users');

        setState(prev => ({
          ...prev,
          users: Array.isArray(data) ? data : [],
          error: ''
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          users: [],
          error:
            error.response?.data?.error ||
            'Failed to fetch users'
        }));
      }
    };

    if (state.isAuthenticated) {
      fetchUsers();
    }
  }, [state.isAuthenticated]);

  const validateForm = () => {
    const { username, password } = state.form;

    if (!username.trim() || !password.trim()) {
      return 'All fields are required';
    }

    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    return null;
  };

  const handleChange = e => {
    setState(prev => ({
      ...prev,
      form: {
        ...prev.form,
        [e.target.name]: e.target.value
      },
      error: '',
      success: ''
    }));
  };

  const handleAuth = async e => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setState(prev => ({
        ...prev,
        error: validationError
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: ''
    }));

    try {
      const endpoint = state.isLogin ? '/login' : '/register';
      const { data } = await API.post(endpoint, state.form);

      if (state.isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          currentUser: data.user,
          loading: false,
          form: {
            username: '',
            password: ''
          }
        }));
      } else {
        setState(prev => ({
          ...prev,
          success: 'Registration successful! Please login.',
          isLogin: true,
          loading: false,
          form: {
            username: '',
            password: ''
          }
        }));
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        (state.isLogin
          ? 'Invalid username or password'
          : 'Registration failed');

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        form: {
          ...prev.form,
          password: ''
        }
      }));
    }
  };

  const handleLogout = () => {
    localStorage.clear();

    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      currentUser: null,
      users: [],
      form: {
        username: '',
        password: ''
      }
    }));
  };

  if (state.checkingBackend) {
    return (
      <div className="app-shell">
        <div className="status-card">
          <div className="logo-circle">M</div>
          <h2>Connecting to backend...</h2>
          <div className="spinner"></div>
          <p>Checking backend service</p>
          <code>{API.defaults.baseURL}</code>
        </div>
      </div>
    );
  }

  if (state.backendError) {
    return (
      <div className="app-shell">
        <div className="status-card error-card">
          <div className="logo-circle danger">!</div>
          <h2>Connection Error</h2>
          <p>{state.backendError}</p>
          <code>{API.defaults.baseURL}</code>
          <button onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="background-shape shape-one"></div>
      <div className="background-shape shape-two"></div>

      {!state.isAuthenticated ? (
        <div className="auth-layout">
          <div className="hero-panel">
            <div className="brand">
              <div className="logo-circle">M</div>
              <span>Mega App</span>
            </div>

            <h1>
              Manage users with a clean Kubernetes-ready app.
            </h1>

            <p>
              React frontend, Node backend, MongoDB database and modern cloud-native deployment.
            </p>

            <div className="feature-list">
              <div>Secure login</div>
              <div>JWT based auth</div>
              <div>Kubernetes ready</div>
            </div>
          </div>

          <div className="auth-box">
            <h2>{state.isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="subtitle">
              {state.isLogin
                ? 'Login to access your dashboard'
                : 'Register a new account'}
            </p>

            <form onSubmit={handleAuth}>
              <label>Username</label>
              <input
                name="username"
                placeholder="Enter username"
                onChange={handleChange}
                value={state.form.username}
                required
                minLength="3"
                maxLength="30"
              />

              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder="Enter password"
                onChange={handleChange}
                value={state.form.password}
                required
                minLength="6"
              />

              <button type="submit" disabled={state.loading}>
                {state.loading ? (
                  <div className="spinner small"></div>
                ) : state.isLogin ? (
                  'Login'
                ) : (
                  'Register'
                )}
              </button>
            </form>

            {state.error && (
              <div className="alert error">{state.error}</div>
            )}

            {state.success && (
              <div className="alert success">{state.success}</div>
            )}

            <p
              className="toggle"
              onClick={() =>
                setState(prev => ({
                  ...prev,
                  isLogin: !prev.isLogin,
                  error: '',
                  success: '',
                  form: {
                    username: prev.form.username,
                    password: ''
                  }
                }))
              }
            >
              {state.isLogin
                ? 'Need an account? Register here'
                : 'Already have an account? Login here'}
            </p>
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <div className="dashboard-header">
            <div>
              <span className="welcome-label">Dashboard</span>
              <h2>Welcome, {state.currentUser?.username}</h2>
            </div>

            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Users</span>
              <strong>{state.users.length}</strong>
            </div>

            <div className="stat-card">
              <span>Status</span>
              <strong>Online</strong>
            </div>
          </div>

          <div className="users-card">
            <h3>Registered Users</h3>

            <ul className="user-list">
              {Array.isArray(state.users) && state.users.length > 0 ? (
                state.users.map(user => (
                  <li key={user._id}>
                    <div className="user-avatar">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <span>{user.username}</span>
                      <small>
                        Joined:{' '}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                  </li>
                ))
              ) : (
                <li className="empty">No users found</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;