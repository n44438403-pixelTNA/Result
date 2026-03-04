import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, ChevronRight, ChevronDown, Edit, FileText, UserCircle } from 'lucide-react';

export default function BrowsePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);
  const [classes, setClasses] = useState({}); // Map session -> classes
  const [exams, setExams] = useState({}); // Map classId -> exams

  // UI State for creating new items
  const [newSessionName, setNewSessionName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newExamName, setNewExamName] = useState('');
  const [showAddClass, setShowAddClass] = useState(null); // sessionId
  const [showAddExam, setShowAddExam] = useState(null); // classId (unique by session-class)

  const navigate = useNavigate();

  const loadSessions = async () => {
    try {
      let data = await db.getSessions();
      if (data.length === 0) {
        // Auto-create 2026-27 session per requirements if none exist
        await db.createSession('2026-27');
        data = ['2026-27'];
      }
      setSessions(data);
    } catch (error) {
       console.error("Failed to load sessions:", error);
       // Fallback for permission errors / no DB access
       setSessions(['2026-27']);
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const toggleSession = async (session) => {
    if (expandedSession === session) {
      setExpandedSession(null);
    } else {
      setExpandedSession(session);
      if (!classes[session]) {
        const classData = await db.getClasses(session);
        setClasses(prev => ({ ...prev, [session]: classData }));
      }
    }
  };

  const toggleClass = async (session, className) => {
    const key = `${session}-${className}`;
    if (expandedClass === key) {
      setExpandedClass(null);
    } else {
      setExpandedClass(key);
      if (!exams[key]) {
        const examData = await db.getExams(session, className);
        setExams(prev => ({ ...prev, [key]: examData }));
      }
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName) return;
    await db.createSession(newSessionName);
    setNewSessionName('');
    loadSessions();
  };

  const handleCreateClass = async (session) => {
    if (!newClassName) return;
    await db.createClass(session, newClassName);
    setNewClassName('');
    setShowAddClass(null);
    // Refresh classes for this session
    const classData = await db.getClasses(session);
    setClasses(prev => ({ ...prev, [session]: classData }));
  };

  const handleCreateExam = async (session, className) => {
    if (!newExamName) return;
    // Create exam with default config
    await db.saveExamConfig(session, className, newExamName, {
      maxMarks: 100,
      subjects: ['Math', 'Science', 'English'] // Default subjects
    });
    setNewExamName('');
    setShowAddExam(null);
    // Refresh exams
    const key = `${session}-${className}`;
    const examData = await db.getExams(session, className);
    setExams(prev => ({ ...prev, [key]: examData }));
  };

  const navigateToExam = (session, className, examName) => {
    // URL encode components to be safe
    navigate(`/exam/${encodeURIComponent(session)}/${encodeURIComponent(className)}/${encodeURIComponent(examName)}`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Browse Results</h1>
        {!user && (
          <Button variant="outline" onClick={() => navigate('/login')} className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" /> Admin Login / Edit
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academic Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {user && (
            <div className="flex gap-2 mb-6">
              <Input
                placeholder="New Session Name (e.g., 2026-27)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleCreateSession}>
                <Plus className="mr-2 h-4 w-4" /> Add Session
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session} className="border rounded-md">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSession(session)}
                >
                  <div className="flex items-center font-medium text-lg">
                    {expandedSession === session ? <ChevronDown className="mr-2 h-5 w-5" /> : <ChevronRight className="mr-2 h-5 w-5" />}
                    {session}
                  </div>
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddClass(showAddClass === session ? null : session);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Class
                    </Button>
                  )}
                </div>

                {expandedSession === session && (
                  <div className="p-4 border-t bg-white ml-4 border-l">
                    {/* Add Class Input */}
                    {user && showAddClass === session && (
                      <div className="flex gap-2 mb-4">
                        <Input
                          placeholder="New Class Name (e.g., Class 10)"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          className="max-w-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button onClick={() => handleCreateClass(session)}>Save</Button>
                      </div>
                    )}

                    {classes[session]?.length === 0 && <p className="text-gray-500 text-sm italic">No classes found.</p>}

                    {classes[session]?.map((className) => (
                      <div key={className} className="mb-2">
                         <div
                          className="flex items-center justify-between p-3 rounded hover:bg-gray-50 cursor-pointer border transition-colors"
                          onClick={() => toggleClass(session, className)}
                        >
                          <div className="flex items-center font-medium">
                            {expandedClass === `${session}-${className}` ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                            {className}
                          </div>
                          {user && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const key = `${session}-${className}`;
                                setShowAddExam(showAddExam === key ? null : key);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add Exam
                            </Button>
                          )}
                        </div>

                        {expandedClass === `${session}-${className}` && (
                          <div className="ml-6 mt-2 border-l pl-4">
                             {/* Add Exam Input */}
                             {user && showAddExam === `${session}-${className}` && (
                              <div className="flex gap-2 mb-4 mt-2">
                                <Input
                                  placeholder="New Exam Name (e.g., Annual Exam)"
                                  value={newExamName}
                                  onChange={(e) => setNewExamName(e.target.value)}
                                  className="max-w-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button onClick={() => handleCreateExam(session, className)}>Save</Button>
                              </div>
                            )}

                            {exams[`${session}-${className}`]?.length === 0 && <p className="text-gray-500 text-sm mt-2 italic">No exams found.</p>}

                            <div className="grid grid-cols-1 gap-2 mt-2">
                                {exams[`${session}-${className}`]?.map((exam) => (
                                    <div key={exam} className="flex items-center justify-between p-3 border rounded hover:bg-blue-50 transition-colors">
                                        <div className="flex items-center font-medium">
                                            <FileText className="mr-2 h-4 w-4 text-blue-500" />
                                            {exam}
                                        </div>
                                        <Button size="sm" variant={user ? "outline" : "default"} onClick={() => navigateToExam(session, className, exam)}>
                                            {user ? <Edit className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                                            {user ? "Edit / View" : "View Results"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
