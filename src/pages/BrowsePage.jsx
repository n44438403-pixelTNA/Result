import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, ChevronRight, ChevronDown, Edit, FileText, UserCircle, Layers, Save, Building, Trash, Download } from 'lucide-react';
import { generateHTML, downloadHTML } from '../lib/html';

export default function BrowsePage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);
  const [classes, setClasses] = useState({}); // Map session -> classes
  const [exams, setExams] = useState({}); // Map classId -> exams
  const [sessionDetails, setSessionDetails] = useState({}); // Map session -> details

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
        // Wrap this in a try-catch so it doesn't fail the whole load if it's permission denied.
        try {
            if (user) {
               await db.createSession('2026-27');
            }
        } catch(e) { console.error(e) }
        data = ['2026-27'];
      }
      setSessions(data);
    } catch (error) {
       console.error("Failed to load sessions:", error);
       // Fallback for permission errors / no DB access
       setSessions(['2026-27']);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      loadSessions();
    }
  }, [user, authLoading]);

  const toggleSession = async (session) => {
    if (expandedSession === session) {
      setExpandedSession(null);
    } else {
      setExpandedSession(session);
      if (!classes[session]) {
        const classData = await db.getClasses(session);
        setClasses(prev => ({ ...prev, [session]: classData }));
      }
      if (!sessionDetails[session]) {
         const details = await db.getSessionDetails(session);
         setSessionDetails(prev => ({ ...prev, [session]: details }));
      }
    }
  };

  const handleUpdateSessionDetails = async (session) => {
     if (!sessionDetails[session]) return;
     await db.updateSessionDetails(session, sessionDetails[session]);
     alert("Session details updated successfully!");
  };

  const buildExamTableHTML = (examName, students, subjectGroups) => {
      let html = '';
      if (!students || students.length === 0) return html;

      const calculateTotalObtained = (student) => {
        if (!student.marks || !subjectGroups) return 0;
        let sum = 0;
        subjectGroups.forEach(group => {
            group.tests.forEach(test => {
                const mark = student.marks[test.id];
                if (mark !== 'A' && mark !== 'X') {
                   sum += (parseInt(mark) || 0);
                }
            });
        });
        return sum;
      };

      const calculateTotalMax = (student) => {
          if (!subjectGroups) return 0;
          let sum = 0;
          subjectGroups.forEach(group => {
              group.tests.forEach(test => {
                  const mark = student?.marks?.[test.id];
                  if (mark !== 'X') {
                      sum += (parseInt(test.maxMarks) || 0);
                  }
              });
          });
          return sum;
      };

      // Rank calculation
      let rankedList = [...students].map(s => ({
          ...s,
          totalObtained: calculateTotalObtained(s),
          totalMax: calculateTotalMax(s)
      })).sort((a, b) => b.totalObtained - a.totalObtained);

      let currentRank = 1;
      for (let i = 0; i < rankedList.length; i++) {
          if (i > 0 && rankedList[i].totalObtained < rankedList[i - 1].totalObtained) {
              currentRank = i + 1;
          }
          rankedList[i].rank = currentRank;
      }

      html += `<div class="mb-4 mt-6">
          <h3 class="text-xl font-bold border-b pb-2">Exam: ${examName}</h3>
      </div>`;

      html += `<table class="w-full mb-8" style="table-layout: auto;">
          <thead>
              <tr class="bg-gray-100">
                  <th class="p-2 border" rowspan="2">Rank</th>
                  <th class="p-2 border" rowspan="2">Roll No</th>
                  <th class="p-2 border" rowspan="2" style="min-width: 150px;">Name</th>`;

      subjectGroups.forEach(group => {
          html += `<th class="p-2 border" colspan="${group.tests.length}">${group.subjectName}</th>`;
      });

      html += `   <th class="p-2 border" rowspan="2">Total Marks</th>
                  <th class="p-2 border" rowspan="2">%</th>
              </tr>
              <tr class="bg-gray-50">`;

      subjectGroups.forEach(group => {
          group.tests.forEach(test => {
              html += `<th class="p-2 border text-xs whitespace-nowrap">${test.name || test.id}<br><span style="font-weight:normal;color:#2563eb;">Full: ${test.maxMarks}</span></th>`;
          });
      });

      html += `</tr></thead><tbody>`;

      rankedList.forEach((student) => {
          const perc = student.totalMax > 0 ? ((student.totalObtained / student.totalMax) * 100).toFixed(2) : 0;
          html += `<tr class="hover:bg-gray-50">
              <td class="p-2 border text-center font-bold">#${student.rank}</td>
              <td class="p-2 border text-center">${student.rollNo}</td>
              <td class="p-2 border font-medium">${student.name || 'Unnamed'}</td>`;

          subjectGroups.forEach(group => {
              group.tests.forEach(test => {
                  const marks = student.marks?.[test.id] ?? '-';
                  const isHoliday = marks === 'X';
                  const displayMark = isHoliday ? 'Holiday' : marks;
                  const style = isHoliday ? 'color:#9ca3af;font-size:10px;' : (marks === 'A' ? 'color:#ef4444;font-weight:bold;' : '');
                  html += `<td class="text-center border p-2" style="${style}">${displayMark}</td>`;
              });
          });

          html += `
              <td class="p-2 border text-center font-semibold text-blue-700">${student.totalObtained} / ${student.totalMax}</td>
              <td class="p-2 border text-center font-bold">${perc}%</td>
          </tr>`;
      });

      html += `</tbody></table>`;
      return html;
  };

  const handleDownloadFullSessionReport = async (e, sessionName) => {
    e.stopPropagation();

    const classData = classes[sessionName] || await db.getClasses(sessionName);

    let html = `<div class="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <h1 class="text-3xl font-extrabold uppercase tracking-wider text-gray-900">${sessionDetails[sessionName]?.instituteName || 'Institute'}</h1>
        <div class="mt-4 pt-2 border-t border-gray-300">
           <h2 class="text-xl font-bold text-gray-800">Full Session Report: ${sessionName}</h2>
        </div>
    </div>`;

    for (let cIdx = 0; cIdx < classData.length; cIdx++) {
      const className = classData[cIdx];
      const classExams = exams[className] || await db.getExams(sessionName, className);

      html += `<div class="mt-8 mb-4 bg-gray-100 p-2"><h2 class="text-2xl font-bold text-center">Class: ${className}</h2></div>`;

      for (let eIdx = 0; eIdx < classExams.length; eIdx++) {
          const examName = classExams[eIdx];
          const examData = await db.getStudents(sessionName, className, examName);
          const config = await db.getExamConfig(sessionName, className, examName);
          const students = examData || [];
          const subjectGroups = config?.subjectGroups || [];

          html += buildExamTableHTML(examName, students, subjectGroups);

          if (cIdx < classData.length - 1 || eIdx < classExams.length - 1) {
              html += `<div style="page-break-before: always;"></div>`;
          }
      }
    }

    const fullHtmlContent = generateHTML(html, `${sessionName}_Full_Session_Report`);
    downloadHTML(fullHtmlContent, `${sessionName}_Full_Session_Report.html`);
  };

  const handleDownloadSingleExam = async (e, sessionName, className, examName) => {
      e.stopPropagation();
      const examData = await db.getStudents(sessionName, className, examName);
      const config = await db.getExamConfig(sessionName, className, examName);
      const students = examData || [];
      const subjectGroups = config?.subjectGroups || [];

      let html = `<div class="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 class="text-3xl font-extrabold uppercase tracking-wider text-gray-900">${sessionDetails[sessionName]?.instituteName || 'Institute'}</h1>
          <div class="mt-4 pt-2 border-t border-gray-300">
             <h2 class="text-xl font-bold text-gray-800">Exam Report: ${examName}</h2>
             <p class="text-md font-medium text-gray-600">Session: ${sessionName} | Class: ${className}</p>
          </div>
      </div>`;

      html += buildExamTableHTML(examName, students, subjectGroups);

      const fullHtmlContent = generateHTML(html, `${className}_${examName}_Report`);
      downloadHTML(fullHtmlContent, `${className}_${examName}_Report.html`);
  };

  const handleDetailChange = (session, field, value) => {
      setSessionDetails(prev => ({
          ...prev,
          [session]: {
              ...prev[session],
              [field]: value
          }
      }));
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
      subjectGroups: [
          { subjectName: 'Math', tests: [] },
          { subjectName: 'Science', tests: [] },
          { subjectName: 'Social Science', tests: [] }
      ]
    });
    setNewExamName('');
    setShowAddExam(null);
    // Refresh exams
    const key = `${session}-${className}`;
    const examData = await db.getExams(session, className);
    setExams(prev => ({ ...prev, [key]: examData }));
  };

  const handleDeleteSession = async (sessionName) => {
    if (window.confirm(`Are you sure you want to delete session "${sessionName}" and all its data?`)) {
      await db.deleteSession(sessionName);
      loadSessions();
      setExpandedSession(null);
    }
  };

  const handleDeleteClass = async (sessionName, className) => {
    if (window.confirm(`Are you sure you want to delete class "${className}" from session "${sessionName}"?`)) {
      await db.deleteClass(sessionName, className);
      const classData = await db.getClasses(sessionName);
      setClasses(prev => ({ ...prev, [sessionName]: classData }));
      setExpandedClass(null);
    }
  };

  const handleDeleteExam = async (sessionName, className, examName) => {
    if (window.confirm(`Are you sure you want to delete exam "${examName}" from class "${className}"?`)) {
      await db.deleteExam(sessionName, className, examName);
      const key = `${sessionName}-${className}`;
      const examData = await db.getExams(sessionName, className);
      setExams(prev => ({ ...prev, [key]: examData }));
    }
  };

  const handleRenameExam = async (sessionName, className, oldExamName) => {
      const newExamName = window.prompt(`Enter new name for exam "${oldExamName}":`, oldExamName);
      if (newExamName && newExamName.trim() !== '' && newExamName !== oldExamName) {
          try {
              await db.renameExam(sessionName, className, oldExamName, newExamName.trim());
              const key = `${sessionName}-${className}`;
              const examData = await db.getExams(sessionName, className);
              setExams(prev => ({ ...prev, [key]: examData }));
          } catch (error) {
              console.error("Error renaming exam:", error);
              alert("Failed to rename exam. Check console for details.");
          }
      }
  };

  const navigateToExam = (session, className, examName) => {
    // URL encode components to be safe
    navigate(`/exam/${encodeURIComponent(session)}/${encodeURIComponent(className)}/${encodeURIComponent(examName)}`);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Sessions...</div>;

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
                  <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDownloadFullSessionReport(e, session)}
                        title="Download Full Session Report"
                        className="text-green-600 hover:bg-green-50 hover:text-green-700 hidden sm:flex"
                    >
                        <Download className="h-4 w-4 mr-2" /> Session Report
                    </Button>
                  {user && (
                    <>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  </div>
                </div>

                {expandedSession === session && (
                  <div className="p-4 border-t bg-white ml-4 border-l">

                    {/* Session Details / Settings - Only visible to admin */}
                    {user && (
                        <div className="mb-6 p-4 bg-blue-50/50 rounded-md border border-blue-100">
                            <div className="flex items-center gap-2 mb-3 text-blue-800 font-semibold">
                                <Building className="h-4 w-4" /> Institute Details for {session}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input placeholder="Coaching/School Name" value={sessionDetails[session]?.instituteName || ''} onChange={(e) => handleDetailChange(session, 'instituteName', e.target.value)} />
                                <Input placeholder="Est. (e.g., 2020)" value={sessionDetails[session]?.est || ''} onChange={(e) => handleDetailChange(session, 'est', e.target.value)} />
                                <Input placeholder="Director Name" value={sessionDetails[session]?.director || ''} onChange={(e) => handleDetailChange(session, 'director', e.target.value)} />
                                <Input placeholder="Mobile Number" value={sessionDetails[session]?.mobile || ''} onChange={(e) => handleDetailChange(session, 'mobile', e.target.value)} />
                                <Input placeholder="Address" className="md:col-span-2" value={sessionDetails[session]?.address || ''} onChange={(e) => handleDetailChange(session, 'address', e.target.value)} />
                                <div className="md:col-span-2 flex justify-end">
                                    <Button size="sm" onClick={() => handleUpdateSessionDetails(session)}>
                                        <Save className="h-4 w-4 mr-2" /> Save Details
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

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
                            <div className="flex items-center gap-2">
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClass(session, className);
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
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
                                        <div className="flex items-center gap-2">
                                            {user && (
                                              <>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                    title="Rename Exam"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleRenameExam(session, className, exam);
                                                    }}
                                                  >
                                                    <Edit className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    title="Delete Exam"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteExam(session, className, exam);
                                                    }}
                                                  >
                                                    <Trash className="h-4 w-4" />
                                                  </Button>
                                              </>
                                            )}
                                            <Button size="sm" variant={user ? "outline" : "default"} onClick={() => navigateToExam(session, className, exam)}>
                                                {user ? <Edit className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                                                {user ? "Edit / View" : "View Results"}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              title="Download Event Report"
                                              className="text-green-600 border-green-200 hover:bg-green-50"
                                              onClick={(e) => handleDownloadSingleExam(e, session, className, exam)}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {exams[`${session}-${className}`]?.length > 0 && (
                                    <div className="flex items-center justify-between p-3 border rounded bg-indigo-50 border-indigo-100 hover:bg-indigo-100 transition-colors mt-2">
                                        <div className="flex items-center font-bold text-indigo-700">
                                            <Layers className="mr-2 h-5 w-5" />
                                            Overall Class Result
                                        </div>
                                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate(`/class-result/${encodeURIComponent(session)}/${encodeURIComponent(className)}`)}>
                                            <FileText className="mr-2 h-4 w-4" /> Final Result
                                        </Button>
                                    </div>
                                )}
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
