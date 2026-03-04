import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [settings, setSettings] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    const [sess, sett] = await Promise.all([
      db.getSessions(),
      db.getInstituteSettings()
    ]);
    setSessions(sess);
    setSettings(sett);
  };

  const handleSessionChange = async (e) => {
    const session = e.target.value;
    setSelectedSession(session);
    setSelectedClass('');
    setSelectedExam('');
    setClasses([]);
    setExams([]);
    
    if (session) {
      const cls = await db.getClasses(session);
      setClasses(cls);
    }
  };

  const handleClassChange = async (e) => {
    const className = e.target.value;
    setSelectedClass(className);
    setSelectedExam('');
    setExams([]);

    if (className) {
      const exm = await db.getExams(selectedSession, className);
      setExams(exm);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (selectedSession && selectedClass && selectedExam && rollNo) {
      navigate(`/result/${encodeURIComponent(selectedSession)}/${encodeURIComponent(selectedClass)}/${encodeURIComponent(selectedExam)}/${encodeURIComponent(rollNo)}`);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-8">
        {settings?.logoUrl && (
          <img src={settings.logoUrl} alt="Logo" className="h-20 mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-4xl font-bold text-gray-800 mb-2">{settings?.instituteName || 'Result Portal'}</h1>
        <p className="text-gray-600">{settings?.tagline || 'Check your exam results online'}</p>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">Find Your Result</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Session</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedSession}
                onChange={handleSessionChange}
                required
              >
                <option value="">Select Session</option>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedClass}
                onChange={handleClassChange}
                disabled={!selectedSession}
                required
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Exam</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                disabled={!selectedClass}
                required
              >
                <option value="">Select Exam</option>
                {exams.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Roll Number</label>
              <Input
                type="number"
                placeholder="Enter Roll No."
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full text-lg h-12" disabled={!selectedSession || !selectedClass || !selectedExam || !rollNo}>
              <Search className="mr-2 h-5 w-5" /> Search Result
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
