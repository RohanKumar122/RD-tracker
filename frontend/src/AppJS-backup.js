import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  Calendar, 
  Settings, 
  Phone, 
  Edit, 
  Trash2, 
  Info, 
  Plus, 
  Check, 
  X,
  LogOut,
  User,
  Mail,
  IndianRupee ,
  Search,
  AlertCircle
} from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

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
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
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
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
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
                    onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
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
                    onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
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
                  onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
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
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    currentSection === id
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

// Home Section Component
const HomeSection = ({ stats, people, makeCall, togglePaymentStatus }) => {
  const pendingPeople = people.filter(p => p.status === 'pending').slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6">Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Total People</p>
              <p className="text-xl lg:text-2xl font-bold text-white">{stats.totalPeople || 0}</p>
            </div>
            <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Paid This Month</p>
              <p className="text-xl lg:text-2xl font-bold text-green-500">{stats.paidCount || 0}</p>
            </div>
            <Check className="w-6 h-6 lg:w-8 lg:h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Pending</p>
              <p className="text-xl lg:text-2xl font-bold text-red-500">{stats.pendingCount || 0}</p>
            </div>
            <X className="w-6 h-6 lg:w-8 lg:h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Collection Rate</p>
              <p className="text-xl lg:text-2xl font-bold text-purple-500">{stats.collectionRate || 0}%</p>
            </div>
            <IndianRupee className="w-6 h-6 lg:w-8 lg:h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Amount Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">Total Expected</h3>
          <p className="text-xl lg:text-2xl font-bold text-blue-400">₹{stats.totalAmount || 0}</p>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">Collected</h3>
          <p className="text-xl lg:text-2xl font-bold text-green-400">₹{stats.collectedAmount || 0}</p>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">Pending</h3>
          <p className="text-xl lg:text-2xl font-bold text-red-400">₹{stats.pendingAmount || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      {pendingPeople.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-lg lg:text-xl font-semibold text-white mb-4">Quick Call Actions - Pending Payments</h3>
          <div className="space-y-3">
            {pendingPeople.map(person => (
              <div key={person._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="text-white font-medium text-sm lg:text-base">{person.name}</p>
                  <p className="text-gray-400 text-xs lg:text-sm">₹{person.amount} pending</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => makeCall(person.phone)}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Phone className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  <button
                    onClick={() => togglePaymentStatus(person._id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Alert */}
      {stats.isAfter15th && stats.overdueCount > 0 && (
        <div className="bg-red-900 border border-red-700 rounded-xl p-4 lg:p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-red-200">Overdue Payments Alert</h3>
              <p className="text-red-300 text-sm lg:text-base">
                {stats.overdueCount} people have overdue payments (after 15th of the month)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// People Section Component  
const PeopleSection = ({ 
  people, 
  searchTerm, 
  setSearchTerm, 
  showAddForm, 
  setShowAddForm,
  editingPerson,
  setEditingPerson,
  handleAddPerson,
  handleUpdatePerson,
  handleDeletePerson,
  makeCall,
  togglePaymentStatus,
  loading
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">People Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          <span>Add Person</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search people..."
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* People List */}
      <div className="grid gap-4">
        {people.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No people found</p>
            <p className="text-gray-500">Add some people to start tracking RD payments</p>
          </div>
        ) : (
          people.map(person => (
            <PersonCard
              key={person._id}
              person={person}
              onCall={() => makeCall(person.phone)}
              onEdit={() => setEditingPerson(person)}
              onDelete={() => handleDeletePerson(person._id)}
              onToggleStatus={() => togglePaymentStatus(person._id)}
            />
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingPerson) && (
        <PersonForm
          person={editingPerson}
          onSave={editingPerson ? handleUpdatePerson : handleAddPerson}
          onCancel={() => {
            setShowAddForm(false);
            setEditingPerson(null);
          }}
        />
      )}
    </div>
  );
};

// Person Card Component
const PersonCard = ({ person, onCall, onEdit, onDelete, onToggleStatus }) => {
  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold text-white">{person.name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              person.status === 'paid' ? 'bg-green-600 text-white' : 
              person.status === 'partial' ? 'bg-yellow-600 text-white' : 
              'bg-red-600 text-white'
            }`}>
              {person.status === 'paid' ? 'Paid' : person.status === 'partial' ? 'Partial' : 'Pending'}
            </span>
          </div>
          <p className="text-gray-400">{person.email}</p>
          <p className="text-gray-400">{person.phone}</p>
          <p className="text-purple-400 font-semibold">₹{person.amount}</p>
          <p className="text-gray-500 text-sm">Last Payment: {formatDate(person.lastPayment)}</p>
          <p className="text-gray-500 text-sm">Total Contributed: ₹{person.totalContributed || 0}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onCall}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
            title="Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          
          <button
            onClick={onEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
          
          <button
            onClick={onToggleStatus}
            className={`p-2 rounded-lg transition-colors ${
              person.status === 'paid' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white`}
            title={person.status === 'paid' ? 'Mark as Pending' : 'Mark as Paid'}
          >
            {person.status === 'paid' ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          </button>
          
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Person Form Component
const PersonForm = ({ person, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: person?.name || '',
    email: person?.email || '',
    phone: person?.phone || '',
    amount: person?.amount || '',
    notes: person?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dataToSave = {
        ...formData,
        amount: Number(formData.amount)
      };

      if (person) {
        dataToSave.id = person._id;
      }

      await onSave(dataToSave);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 max-h-screen overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">
          {person ? 'Edit Person' : 'Add New Person'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200 text-sm">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              placeholder="+91 9876543210"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">RD Amount *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              min="1"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 h-20 resize-none"
              placeholder="Optional notes..."
              disabled={loading}
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : person ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Monthly Section Component
const MonthlySection = ({ people, stats, togglePaymentStatus }) => {
  const currentDate = new Date();
  const isAfter15th = currentDate.getDate() >= 15;
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Monthly Tracking</h2>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Current Month</p>
          <p className="text-white font-semibold">{currentMonth}</p>
        </div>
      </div>
      
      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Expected</p>
          <p className="text-xl font-bold text-white">₹{stats.totalAmount || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Collected</p>
          <p className="text-xl font-bold text-green-500">₹{stats.collectedAmount || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Pending</p>
          <p className="text-xl font-bold text-red-500">₹{stats.pendingAmount || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Collection Rate</p>
          <p className="text-xl font-bold text-purple-500">{stats.collectionRate || 0}%</p>
        </div>
      </div>

      {isAfter15th && stats.overdueCount > 0 && (
        <div className="bg-red-900 border border-red-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-200 font-semibold">RD Collection Due - 15th of the month has passed!</p>
              <p className="text-red-300">{stats.overdueCount} people have overdue payments</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid gap-4">
        {people.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No people to track</p>
          </div>
        ) : (
          people.map(person => (
            <div key={person._id} className={`bg-gray-800 rounded-xl p-6 border ${
              person.status === 'pending' && isAfter15th ? 'border-red-500' : 'border-gray-700'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{person.name}</h3>
                  <p className="text-gray-400">Expected: ₹{person.amount}</p>
                  <p className="text-gray-400">Total Contributed: ₹{person.totalContributed || 0}</p>
                  <p className="text-gray-400">
                    Last Payment: {person.lastPayment ? new Date(person.lastPayment).toLocaleDateString() : 'Never'}
                  </p>
                  {person.status === 'pending' && isAfter15th && (
                    <p className="text-red-400 text-sm font-medium">⚠️ Overdue</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-lg font-semibold ${
                    person.status === 'paid' ? 'bg-green-600 text-white' : 
                    person.status === 'partial' ? 'bg-yellow-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {person.status === 'paid' ? 'Paid' : person.status === 'partial' ? 'Partial' : 'Pending'}
                  </span>
                  
                  <button
                    onClick={() => togglePaymentStatus(person._id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      person.status === 'paid' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    Mark as {person.status === 'paid' ? 'Pending' : 'Paid'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Settings Section Component
const SettingsSection = ({ user }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Settings</h2>
      
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">User Profile</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Name</label>
            <p className="text-white">{user?.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <p className="text-white">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Last Login</label>
            <p className="text-white">
              {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Member Since</label>
            <p className="text-white">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">Application Information</h3>
        <div className="space-y-2 text-gray-400">
          <p>RD Tracker helps you manage recurring deposits efficiently.</p>
          <p>Track payments, manage contacts, and stay on top of collection schedules.</p>
          <p className="text-sm text-gray-500 mt-4">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default RDTrackerApp;