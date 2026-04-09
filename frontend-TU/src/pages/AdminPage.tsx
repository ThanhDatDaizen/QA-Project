// Admin Page
import React from 'react';
import { useTuIdentity } from '../context/TuIdentityContext';

export const AdminPage: React.FC = () => {
  const { user } = useTuIdentity();

  return (
    <div className="bg-tu-dark-beast-900 min-h-screen">
      <div className="tu-container">
        <h1 className="text-4xl font-bold mb-8">Admin Panel ⚙️</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="tu-card">
            <h2 className="text-2xl font-bold mb-4 text-tu-primary-400">User Management</h2>
            <p className="text-tu-dark-beast-400 mb-4">Manage system users and roles</p>
            <button className="tu-btn-primary">Manage Users</button>
          </div>

          <div className="tu-card">
            <h2 className="text-2xl font-bold mb-4 text-tu-primary-400">System Settings</h2>
            <p className="text-tu-dark-beast-400 mb-4">Configure system parameters</p>
            <button className="tu-btn-primary">Settings</button>
          </div>

          <div className="tu-card">
            <h2 className="text-2xl font-bold mb-4 text-tu-primary-400">Reports</h2>
            <p className="text-tu-dark-beast-400 mb-4">View system reports and analytics</p>
            <button className="tu-btn-primary">View Reports</button>
          </div>

          <div className="tu-card">
            <h2 className="text-2xl font-bold mb-4 text-tu-primary-400">Audit Log</h2>
            <p className="text-tu-dark-beast-400 mb-4">View system audit logs</p>
            <button className="tu-btn-primary">View Logs</button>
          </div>
        </div>

        <div className="mt-8 tu-card">
          <h2 className="text-2xl font-bold mb-4">Admin Info</h2>
          <p className="text-tu-dark-beast-400">
            You are logged in as: <span className="text-tu-primary-400 font-semibold">{user?.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
