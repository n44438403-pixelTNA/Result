import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { themes } from '../../lib/themes';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Check, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

const ResultPreview = ({ theme, settings, scale = 1 }) => {
  const s = theme.styles;
  const dummyData = {
    name: 'Rahul Kumar',
    roll: '101',
    marks: [
      { subject: 'Math', marks: 95 },
      { subject: 'Science', marks: 88 },
      { subject: 'English', marks: 92 }
    ]
  };

  return (
    <div 
      className={cn("w-full h-full text-left overflow-hidden relative", s.container)}
      style={{ fontSize: `${12 * scale}px`, padding: `${20 * scale}px` }}
    >
      <div className={s.header}>
        {settings.logoUrl && (
           <img 
             src={settings.logoUrl} 
             alt="Logo" 
             className="mx-auto mb-2 object-contain"
             style={{ height: `${40 * scale}px` }} 
           />
        )}
        <h1 className={s.instituteName} style={{ fontSize: `${24 * scale}px` }}>{settings.instituteName || 'Institute Name'}</h1>
        <p className={s.tagline} style={{ fontSize: `${12 * scale}px` }}>{settings.tagline || 'Tagline here'}</p>
        <p style={{ fontSize: `${10 * scale}px` }}>{settings.address || 'Address Line 1, City'}</p>
      </div>

      <div className="mb-4 text-xs space-y-1" style={{ fontSize: `${10 * scale}px` }}>
        <p><strong>Name:</strong> {dummyData.name}</p>
        <p><strong>Roll No:</strong> {dummyData.roll}</p>
      </div>

      <table className="w-full text-xs" style={{ fontSize: `${10 * scale}px` }}>
        <thead>
          <tr className={s.tableHeader}>
            <th className="p-1 text-left">Subject</th>
            <th className="p-1 text-center">Marks</th>
          </tr>
        </thead>
        <tbody>
          {dummyData.marks.map((m, i) => (
            <tr key={i} className={s.tableRow}>
              <td className="p-1 text-left">{m.subject}</td>
              <td className="p-1 text-center">{m.marks}</td>
            </tr>
          ))}
          <tr className="font-bold border-t">
            <td className="p-1 text-left">Total</td>
            <td className="p-1 text-center">275 / 300</td>
          </tr>
        </tbody>
      </table>

      <div className={s.footer} style={{ fontSize: `${10 * scale}px` }}>
        <p>Result Generated on 2026-05-20</p>
      </div>
    </div>
  );
};

export default function ThemeDesigner() {
  const [currentSettings, setCurrentSettings] = useState(null);
  const [selectedThemeId, setSelectedThemeId] = useState('theme1');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const settings = await db.getInstituteSettings();
    setCurrentSettings(settings);
    if (settings.themeId) {
      setSelectedThemeId(settings.themeId);
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    setIsSaving(true);
    await db.saveInstituteSettings({ themeId: selectedThemeId });
    setIsSaving(false);
    alert('Theme published successfully!');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Theme Designer</h1>
          <p className="text-gray-500">Select a design for student result cards.</p>
        </div>
        <Button onClick={handlePublish} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Publishing...' : 'Publish Design'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {themes.map((theme) => (
          <div key={theme.id} className="relative group">
            <div 
              className={cn(
                "border-4 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 transform hover:scale-[1.02]",
                selectedThemeId === theme.id ? "border-blue-600 ring-2 ring-blue-300 shadow-xl" : "border-transparent shadow-md hover:shadow-lg"
              )}
              onClick={() => setSelectedThemeId(theme.id)}
            >
              <div className="bg-gray-100 p-4 h-[400px] flex flex-col">
                 <div className="flex-1 bg-white shadow-sm overflow-hidden relative">
                    {/* Scale down the preview to fit */}
                    <div className="absolute inset-0 overflow-y-auto hide-scrollbar">
                         <ResultPreview theme={theme} settings={currentSettings} scale={0.7} />
                    </div>
                 </div>
                 <div className="mt-3 text-center font-bold text-gray-700">
                    {theme.name}
                 </div>
              </div>
              
              {selectedThemeId === theme.id && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
