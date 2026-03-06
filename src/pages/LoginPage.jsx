import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { db } from '../lib/db';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instituteSettings, setInstituteSettings] = useState(null);

  useEffect(() => {
    db.getInstituteSettings().then(setInstituteSettings);
  }, []);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/browse';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      // Small delay to allow Firebase onAuthStateChanged to propagate to React Context
      // before we navigate away, ensuring the next page sees user !== null
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 300);
    } else {
      setError('Invalid credentials or authentication failed.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-blue-900 mb-2 uppercase tracking-wide font-serif drop-shadow-sm">
            {instituteSettings?.instituteName || "Result Portal"}
        </h1>
        <h2 className="text-xl font-bold text-gray-700 mb-4 tracking-wider">
            {instituteSettings?.tagline || "Manage and view examination results efficiently."}
        </h2>
        <div className="text-sm font-semibold text-gray-500 mt-2 flex justify-center gap-4 flex-wrap">
          {instituteSettings?.directorName && <span>Director: {instituteSettings.directorName}</span>}
          {instituteSettings?.mobileNumber && <span>Mob: {instituteSettings.mobileNumber}</span>}
        </div>
        {instituteSettings?.address && (
            <div className="mt-2 text-sm text-gray-500 font-medium border-b pb-4">
                {instituteSettings.address}
            </div>
        )}
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                }}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                 Password
                 {email === 'nadimanwar794@gmail.com' && <span className="text-xs text-blue-500 ml-2 font-normal">(Default: ns841414)</span>}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                }}
                placeholder="********"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
