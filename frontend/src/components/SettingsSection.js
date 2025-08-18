import React from 'react';

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

export default SettingsSection;