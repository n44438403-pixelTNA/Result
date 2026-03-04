import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    instituteName: '',
    tagline: '',
    directorName: '',
    address: '',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    const data = await db.getInstituteSettings();
    setSettings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await db.saveInstituteSettings(settings);
    setIsSaving(false);
    alert('Settings saved!');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Institute Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Institute Name</label>
            <Input
              name="instituteName"
              value={settings.instituteName}
              onChange={handleChange}
              placeholder="e.g. Springfield High School"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tagline / Subtitle</label>
            <Input
              name="tagline"
              value={settings.tagline}
              onChange={handleChange}
              placeholder="e.g. Excellence in Education"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Director / Principal Name</label>
            <Input
              name="directorName"
              value={settings.directorName}
              onChange={handleChange}
              placeholder="e.g. Dr. A. Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Input
              name="address"
              value={settings.address}
              onChange={handleChange}
              placeholder="Full Address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Logo URL</label>
            <Input
              name="logoUrl"
              value={settings.logoUrl}
              onChange={handleChange}
              placeholder="https://example.com/logo.png"
            />
            {settings.logoUrl && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Preview:</p>
                <img src={settings.logoUrl} alt="Logo Preview" className="h-16 object-contain border p-1 rounded" />
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
