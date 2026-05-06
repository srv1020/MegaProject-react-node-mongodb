import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Backend URL from environment variable
console.log('BACKEND URL:', process.env.REACT_APP_API_URL);

// Axios instance
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token automatically
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle unauthorized responses
API.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes('/api/login')
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

  // ======================
  // Backend Health Check
  // ======================
  useEffect(() => {
    const checkBackend = async (retryCount = 0) => {
      try {
        const { data } = await API.get('/api/healthz');

        if (data.status === 'ok') {
          setState(prev => ({
            ...prev,
            checkingBackend: false,
            backendError: null
          }));
        }
      } catch (error) {
        console.error('Backend check failed:', error);

        if (retryCount < 2) {
          setTimeout(() => {
            checkBackend(retryCount + 1);
          }, 2000);

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

  // ======================
  // Restore Login Session
  // ======================
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(
      localStorage.getItem('user')
    );

    if (token && user) {
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        currentUser: user
      }));
    }
  }, []);

  // ======================
  // Fetch Users
  // ======================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await API.get('/api/users');

        setState(prev => ({
          ...prev,
          users: Array.isArray(data)
            ? data
            : [],
          error: ''
        }));
      } catch (error) {
        console.error(error);

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

  // ======================
  // Form Validation
  // ======================
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

  // ======================
  // Handle Input Change
  // ======================
  const handleChange = e => {
    setState(prev => ({
      ...prev,
      form: {
        ...prev.form,
        [e.target.name]: e.target.value
      },
      error: ''
    }));
  };

  // ======================
  // Login / Register
  // ======================
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
      const endpoint = state.isLogin
        ? '/api/login'
        : '/api/register';

      const { data } = await API.post(
        endpoint,
        state.form
      );

      if (state.isLogin) {
        localStorage.setItem(
          'token',
          data.token
        );

        localStorage.setItem(
          'user',
          JSON.stringify(data.user)
        );

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
          success:
            'Registration successful! Please login.',
          isLogin: true,
          loading: false,
          form: {
            username: '',
            password: ''
          }
        }));
      }
    } catch (error) {
      console.error(error);

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

  // ======================
  // Logout
  // ======================
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

  // ======================
  // Loading Screen
  // ======================
  if (state.checkingBackend) {
    return (
      <div className="container">
        <div className="health-check">
          <h2>Connecting to backend...</h2>

          <div className="spinner"></div>

          <p>
            Checking:{' '}
            {API.defaults.baseURL}
          </p>
        </div>
      </div>
    );
  }

  // ======================
  // Backend Error
  // ======================
  if (state.backendError) {
    return (
      <div className="container">
        <div className="error-panel">
          <h2>Connection Error</h2>

          <p>{state.backendError}</p>

          <p>
            Verify backend is running at:
          </p>

          <code>
            {API.defaults.baseURL}
          </code>

          <button
            className="retry-btn"
            onClick={() =>
              window.location.reload()
            }
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ======================
  // Main App
  // ======================
  return (
    <div className="container">
      {!state.isAuthenticated ? (
        <div className="auth-box">
          <h2>
            {state.isLogin
              ? 'Login'
              : 'Register'}
          </h2>

          <form onSubmit={handleAuth}>
            <input
              name="username"
              placeholder="Username"
              onChange={handleChange}
              value={state.form.username}
              required
              minLength="3"
              maxLength="30"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              onChange={handleChange}
              value={state.form.password}
              required
              minLength="6"
            />

            <button
              type="submit"
              disabled={state.loading}
              className={
                state.loading
                  ? 'loading'
                  : ''
              }
            >
              {state.loading ? (
                <div className="spinner"></div>
              ) : state.isLogin ? (
                'Login'
              ) : (
                'Register'
              )}
            </button>
          </form>

          {state.error && (
            <div className="alert error">
              {state.error}
            </div>
          )}

          {state.success && (
            <div className="alert success">
              {state.success}
            </div>
          )}

          <p
            className="toggle"
            onClick={() =>
              setState(prev => ({
                ...prev,
                isLogin:
                  !prev.isLogin,
                error: '',
                form: {
                  username:
                    prev.form.username,
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
      ) : (
        <div className="dashboard">
          <div className="header">
            <h2>
              Welcome,{' '}
              {
                state.currentUser
                  ?.username
              }
            </h2>

            <button
              onClick={handleLogout}
              className="logout-btn"
            >
              Logout
            </button>
          </div>

          <h3>
            Registered Users (
            {state.users.length})
          </h3>

          <ul className="user-list">
            {Array.isArray(
              state.users
            ) &&
            state.users.length >
              0 ? (
              state.users.map(user => (
                <li key={user._id}>
                  <span>
                    {user.username}
                  </span>

                  <small>
                    Joined:{' '}
                    {new Date(
                      user.createdAt
                    ).toLocaleDateString()}
                  </small>
                </li>
              ))
            ) : (
              <li className="empty">
                No users found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;