import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { Settings, X, Mail, Lock, UserPlus } from 'lucide-react';

export default function AdminManager({ isOpen, onClose }) {
  const { user, registerAdmin, updateAdminEmail, updateAdminPassword } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'addAdmin'

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [addAdminMessage, setAddAdminMessage] = useState({ type: '', text: '' });

  if (!user || !isOpen) return null;

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    if (!newEmail) return;
    const res = await updateAdminEmail(newEmail);
    if (res.success) {
      setProfileMessage({ type: 'success', text: 'Email updated successfully!' });
      setNewEmail('');
    } else {
      setProfileMessage({ type: 'error', text: res.message || 'Failed to update email. You may need to log out and log back in.' });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    if (!newPassword) return;
    const res = await updateAdminPassword(newPassword);
    if (res.success) {
      setProfileMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
    } else {
      setProfileMessage({ type: 'error', text: res.message || 'Failed to update password. You may need to log out and log back in.' });
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAddAdminMessage({ type: '', text: '' });
    if (!newAdminEmail || !newAdminPassword) return;

    // Note: Creating a user with the client SDK logs the current user out and into the new account.
    // For this simple app, we will let them know they will be logged into the new account.
    if (window.confirm("Adding a new admin will log you out of your current account and into the new one. Proceed?")) {
        const res = await registerAdmin(newAdminEmail, newAdminPassword);
        if (res.success) {
            setAddAdminMessage({ type: 'success', text: 'Admin created! You are now logged in as the new admin.' });
            setNewAdminEmail('');
            setNewAdminPassword('');
            setTimeout(() => onClose(), 2000);
        } else {
            setAddAdminMessage({ type: 'error', text: res.message || 'Failed to create admin.' });
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex flex-row justify-between items-start border-b pb-4">
          <div>
            <DialogTitle className="text-xl flex items-center gap-2"><Settings className="h-5 w-5"/> Admin Settings</DialogTitle>
            <DialogDescription>Manage your account or add new administrators.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
             <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex gap-2 border-b mb-6">
            <button
                className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('profile')}
            >
                My Account
            </button>
            <button
                className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'addAdmin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('addAdmin')}
            >
                Add New Admin
            </button>
        </div>

        {activeTab === 'profile' && (
            <div className="space-y-6">
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Current Logged-in Account</h3>
                    <p className="text-sm bg-gray-100 p-2 rounded text-gray-600 font-mono">{user.email}</p>
                </div>

                {profileMessage.text && (
                    <div className={`p-3 rounded text-sm ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {profileMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <form onSubmit={handleUpdateEmail} className="space-y-3 bg-white border p-4 rounded shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Mail className="h-4 w-4" /> Change Email
                        </div>
                        <Input
                            type="email"
                            placeholder="New Email Address"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            required
                        />
                        <Button type="submit" variant="outline" className="w-full">Update Email</Button>
                    </form>

                    <form onSubmit={handleUpdatePassword} className="space-y-3 bg-white border p-4 rounded shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Lock className="h-4 w-4" /> Change Password
                        </div>
                        <Input
                            type="password"
                            placeholder="New Password (min 6 chars)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" variant="outline" className="w-full">Update Password</Button>
                    </form>
                </div>
                <p className="text-xs text-gray-400 italic mt-2">Note: For security reasons, updating credentials may require you to have logged in recently. If you see an error, please log out and log back in, then try again.</p>
            </div>
        )}

        {activeTab === 'addAdmin' && (
            <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded mb-4">
                    <h3 className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                        <UserPlus className="h-5 w-5" /> Register Administrator
                    </h3>
                    <p className="text-sm text-blue-600">
                        Create a new admin account. Note: creating an account will automatically log you out of your current session and log you into the new account.
                    </p>
                </div>

                {addAdminMessage.text && (
                    <div className={`p-3 rounded text-sm ${addAdminMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {addAdminMessage.text}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1">Email Address</label>
                    <Input
                        type="email"
                        placeholder="admin2@example.com"
                        value={newAdminEmail}
                        onChange={e => setNewAdminEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <Input
                        type="password"
                        placeholder="Must be at least 6 characters"
                        value={newAdminPassword}
                        onChange={e => setNewAdminPassword(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" className="w-full mt-4">Create Admin Account</Button>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
