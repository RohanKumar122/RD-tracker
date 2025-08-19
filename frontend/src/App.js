import React, { useState, useEffect } from 'react';
// import PersonCard from './components/PersonCard';
import PeopleSection from './components/PeopleSection';
// import PersonForm from './components/PersonForm';
import MonthlySection from './components/MonthlySection';
import HomeSection from './components/HomeSection';
import SettingsSection from './components/SettingsSection';
import {
  Users,
  Home,
  Calendar,
  Settings,
  X,
  LogOut,
  User,
  Mail,
  AlertCircle,
  // Contact
} from 'lucide-react';

// API Configuration TESTING
// const API_BASE_URL_DEV = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
// const API_BASE_URL = API_BASE_URL_DEV + '/api';

// production URL
const API_BASE_URL  = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// API Service
const api = {
  // Set auth token with expiration (45 days for mobile)
  setAuthToken: (token) => {
    if (token) {
      const expirationTime = Date.now() + (45 * 24 * 60 * 60 * 1000); // 45 days in milliseconds
      const authData = {
        token: token,
        expiresAt: expirationTime
      };

      // Check if it's a mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Use localStorage for mobile devices to persist for 45 days
        localStorage.setItem('authData', JSON.stringify(authData));
      } else {
        // Use sessionStorage for desktop (session-based)
        sessionStorage.setItem('authData', JSON.stringify(authData));
      }
    } else {
      localStorage.removeItem('authData');
      sessionStorage.removeItem('authData');
    }
  },

  // Get auth token and check expiration
  getAuthToken: () => {
    let authDataStr = localStorage.getItem('authData') || sessionStorage.getItem('authData');

    if (!authDataStr) return null;

    try {
      const authData = JSON.parse(authDataStr);

      // Check if token has expired
      if (Date.now() > authData.expiresAt) {
        // Token expired, remove it
        localStorage.removeItem('authData');
        sessionStorage.removeItem('authData');
        return null;
      }

      return authData.token;
    } catch (error) {
      // Invalid auth data, remove it
      localStorage.removeItem('authData');
      sessionStorage.removeItem('authData');
      return null;
    }
  },

  // API call helper
  request: async (endpoint, options = {}) => {
    const token = api.getAuthToken(); // Use the updated getAuthToken method
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Auth API calls
  auth: {
    signup: (userData) => api.request('/auth/signup', {
      method: 'POST',
      body: userData,
    }),
    login: (credentials) => api.request('/auth/login', {
      method: 'POST',
      body: credentials,
    }),
    getProfile: () => api.request('/auth/me'),
    logout: () => api.request('/auth/logout', { method: 'POST' }),
  },

  // People API calls
  people: {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return api.request(`/people${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => api.request(`/people/${id}`),
    create: (personData) => api.request('/people', {
      method: 'POST',
      body: personData,
    }),
    update: (id, personData) => api.request(`/people/${id}`, {
      method: 'PUT',
      body: personData,
    }),
    delete: (id) => api.request(`/people/${id}`, {
      method: 'DELETE',
    }),
    updateStatus: (id, status) => api.request(`/people/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),
    addPayment: (id, paymentData) => api.request(`/people/${id}/payment`, {
      method: 'POST',
      body: paymentData,
    }),
    getPending: () => api.request('/people/pending/current-month'),
  },

  // Dashboard API calls
  dashboard: {
    getStats: () => api.request('/dashboard/stats'),
    getRecentActivity: (limit = 10) => api.request(`/dashboard/recent-activity?limit=${limit}`),
    getMonthlyStats: (month) => api.request(`/dashboard/monthly-summary/${month || ''}`),
    getOverdue: () => api.request('/dashboard/overdue'),
    getTrends: () => api.request('/dashboard/trends'),
  },
};

const RDTrackerApp = () => {
  const [currentSection, setCurrentSection] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [people, setPeople] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '' });
  const [showSignup, setShowSignup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Added state for sidebar

  // Check authentication on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadInitialData();
    }
  }, [isLoggedIn]);

  // Close sidebar when section changes (for mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentSection]);

  const checkAuthStatus = async () => {
    const token = api.getAuthToken();
    if (token) {
      try {
        const response = await api.auth.getProfile();
        setUser(response.user);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        api.setAuthToken(null);
      }
    }
    setLoading(false);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [peopleResponse, statsResponse] = await Promise.all([
        api.people.getAll(),
        api.dashboard.getStats(),
      ]);

      setPeople(peopleResponse.data);
      setDashboardStats(statsResponse.data);
    } catch (error) {
      setError('Failed to load data');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.auth.login(loginForm);
      api.setAuthToken(response.token);
      setUser(response.user);
      setIsLoggedIn(true);
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.auth.signup(signupForm);
      api.setAuthToken(response.token);
      setUser(response.user);
      setIsLoggedIn(true);
      setSignupForm({ name: '', email: '', password: '' });
      setShowSignup(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      api.setAuthToken(null);
      setIsLoggedIn(false);
      setUser(null);
      setPeople([]);
      setDashboardStats({});
      setCurrentSection('home');
    }
  };

  const handleAddPerson = async (personData) => {
    try {
      setLoading(true);
      const response = await api.people.create(personData);
      setPeople([response.data, ...people]);
      setShowAddForm(false);
      await loadDashboardStats(); // Refresh stats
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePerson = async (updatedPerson) => {
    try {
      setLoading(true);
      const response = await api.people.update(updatedPerson.id || updatedPerson._id, updatedPerson);
      setPeople(people.map(p => p._id === response.data._id ? response.data : p));
      setEditingPerson(null);
      await loadDashboardStats(); // Refresh stats
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerson = async (id) => {
    if (!window.confirm('Are you sure you want to delete this person?')) {
      return;
    }

    try {
      setLoading(true);
      await api.people.delete(id);
      setPeople(people.filter(p => p._id !== id));
      await loadDashboardStats(); // Refresh stats
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentStatus = async (id) => {
    try {
      const person = people.find(p => p._id === id);
      const newStatus = person.status === 'paid' ? 'pending' : 'paid';

      const response = await api.people.updateStatus(id, newStatus);
      setPeople(people.map(p => p._id === id ? response.data : p));
      await loadDashboardStats(); // Refresh stats
    } catch (error) {
      setError(error.message);
    }
  };

  const makeCall = (phone) => {
    window.open(`tel:${phone}`);
  };

  const loadDashboardStats = async () => {
    try {
      const response = await api.dashboard.getStats();
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  // Filter and search people
  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort people: pending first, then paid
  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'paid') return -1;
    if (a.status === 'paid' && b.status === 'pending') return 1;
    return 0;
  });

  // Loading screen
  if (loading && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Login/Signup UI
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">RD Tracker</h1>
            <p className="text-gray-400">Manage your recurring deposits</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          )}

          {!showSignup ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignup(true);
                    setError('');
                  }}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                  disabled={loading}
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing up...' : 'Sign Up'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignup(false);
                    setError('');
                  }}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                  disabled={loading}
                >
                  Already have an account? Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-300 hover:text-white transition-colors"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className="block w-5 h-0.5 bg-current mb-1"></span>
                <span className="block w-5 h-0.5 bg-current mb-1"></span>
                <span className="block w-5 h-0.5 bg-current"></span>
              </div>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">RD Tracker</h1>
              {user && <p className="text-gray-400 text-sm">Welcome, {user.name}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* <button className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-2">
    <Contact className="w-8 h-8 " />
    {/* <span className="hidden sm:inline">PhoneBook</span> */}
            {/* </button> */} */

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </nav>

      {error && (
        <div className="bg-red-900 border-b border-red-700 px-4 py-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex relative">
        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-800 min-h-screen border-r border-gray-700 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4">
            <nav className="space-y-2">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'people', label: 'People Management', icon: Users },
                { id: 'monthly', label: 'Monthly Tracking', icon: Calendar },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentSection(id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentSection === id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="text-white text-lg">Loading...</div>
            </div>
          )}

          {!loading && currentSection === 'home' && (
            <HomeSection
              stats={dashboardStats}
              people={people}
              makeCall={makeCall}
              togglePaymentStatus={togglePaymentStatus}
            />
          )}

          {!loading && currentSection === 'people' && (
            <PeopleSection
              people={sortedPeople}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showAddForm={showAddForm}
              setShowAddForm={setShowAddForm}
              editingPerson={editingPerson}
              setEditingPerson={setEditingPerson}
              handleAddPerson={handleAddPerson}
              handleUpdatePerson={handleUpdatePerson}
              handleDeletePerson={handleDeletePerson}
              makeCall={makeCall}
              togglePaymentStatus={togglePaymentStatus}
              loading={loading}
            />
          )}

          {!loading && currentSection === 'monthly' && (
            <MonthlySection
              people={people}
              stats={dashboardStats}
              togglePaymentStatus={togglePaymentStatus}
            />
          )}

          {!loading && currentSection === 'settings' && <SettingsSection user={user} />}
        </div>
      </div>
    </div>
  );
};


export default RDTrackerApp;