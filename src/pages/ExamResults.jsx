import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Plus, Save, Trash, UserCircle, FileText, BarChart, Search } from 'lucide-react';
import ExamParams from '../components/admin/ExamParams';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import MarksheetModal from '../components/MarksheetModal';
import StudentGraphModal from '../components/StudentGraphModal';

export default function ExamResults() {
  const { user } = useAuth();
  const { session, classId, examId } = useParams();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [graphData, setGraphData] = useState([]);

  const [searchRollNo, setSearchRollNo] = useState('');
  const [searchError, setSearchError] = useState('');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [cfg, currentStudents, classRegistry, details] = await Promise.all([
        db.getExamConfig(session, classId, examId),
        db.getStudents(session, classId, examId),
        db.getClassStudentsRegistry(session, classId),
        db.getSessionDetails(session)
      ]);
      setSessionDetails(details);

      let finalConfig = cfg;
      // Auto-migrate old formats for local state rendering immediately
      if (cfg && !cfg.subjectGroups) {
          if (cfg.tests && Array.isArray(cfg.tests)) {
              finalConfig = { subjectGroups: [{ subjectName: 'General', tests: cfg.tests }] };
          } else if (cfg.subjects && Array.isArray(cfg.subjects)) {
              finalConfig = {
                  subjectGroups: cfg.subjects.map((sub, i) => ({
                     subjectName: sub,
                     tests: [{
                        id: `test_mig_${i}`,
                        name: `${sub} 1`,
                        maxMarks: cfg.maxMarks || 100,
                        date: ''
                     }]
                  }))
              };
          }
      } else if (!cfg) {
          finalConfig = { subjectGroups: [] };
      }

      setConfig(finalConfig);

      // Merge class registry into current exam students
      const studentMap = new Map();

      // First, add all existing students for this specific exam
      (currentStudents || []).forEach(s => {
          if (s.rollNo) {
             studentMap.set(s.rollNo, s);
          }
      });

      // Then, inject any missing students from the class registry
      (classRegistry || []).forEach(regStudent => {
          if (regStudent.rollNo && !studentMap.has(regStudent.rollNo)) {
             studentMap.set(regStudent.rollNo, {
                 rollNo: regStudent.rollNo,
                 name: regStudent.name,
                 marks: {}
             });
          } else if (regStudent.rollNo && studentMap.has(regStudent.rollNo)) {
             // Sync the name if it's missing in current exam but exists in registry
             const existing = studentMap.get(regStudent.rollNo);
             if (!existing.name && regStudent.name) {
                 existing.name = regStudent.name;
             }
          }
      });

      // Convert map to array and sort students by roll number
      const sortedStudents = Array.from(studentMap.values()).sort((a, b) => a.rollNo - b.rollNo);

      setStudents(sortedStudents);
      setLoading(false);
    };

    loadData();
  }, [session, classId, examId]);

  const handleConfigSave = async (newConfig) => {
    await db.saveExamConfig(session, classId, examId, newConfig);
    setConfig(newConfig);
    setShowConfig(false);
  };

  const handleStudentChange = (index, field, value) => {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  const handleMarkChange = (index, testId, value) => {
    const updated = [...students];
    if (!updated[index].marks) updated[index].marks = {};
    updated[index].marks = { ...updated[index].marks, [testId]: value === '' ? '' : parseInt(value) };
    setStudents(updated);
  };

  const addStudent = () => {
    const nextRoll = students.length > 0 ? Math.max(...students.map(s => s.rollNo || 0)) + 1 : 1;
    setStudents([...students, { rollNo: nextRoll, name: '', marks: {} }]);
  };

  const removeStudent = (index) => {
    if (confirm('Are you sure you want to remove this student?')) {
      const updated = students.filter((_, i) => i !== index);
      setStudents(updated);
    }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      await db.saveAllStudents(session, classId, examId, students);
      alert('Saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save.');
    }
    setIsSaving(false);
  };

  const calculateTotalObtained = (student) => {
    if (!student.marks || !config?.subjectGroups) return 0;
    let sum = 0;
    config.subjectGroups.forEach(group => {
        group.tests.forEach(test => {
            sum += (parseInt(student.marks[test.id]) || 0);
        });
    });
    return sum;
  };

  const calculateTotalMax = () => {
      if (!config?.subjectGroups) return 0;
      let sum = 0;
      config.subjectGroups.forEach(group => {
          group.tests.forEach(test => {
              sum += (parseInt(test.maxMarks) || 0);
          });
      });
      return sum;
  };

  const calculatePercentage = (student) => {
      const obtained = calculateTotalObtained(student);
      const max = calculateTotalMax();
      return max > 0 ? ((obtained / max) * 100).toFixed(2) : 0;
  };

  const openGraph = (student) => {
      if (!config?.subjectGroups) return;
      const data = [];
      config.subjectGroups.forEach(group => {
          let subObtained = 0;
          let subMax = 0;
          group.tests.forEach(test => {
              subObtained += (parseInt(student.marks?.[test.id]) || 0);
              subMax += (parseInt(test.maxMarks) || 0);
          });
          const perc = subMax > 0 ? ((subObtained / subMax) * 100).toFixed(2) : 0;
          data.push({ label: group.subjectName, percentage: perc });
      });
      setGraphData(data);
      setSelectedStudent(student);
      setIsGraphOpen(true);
  };

  const handleSearch = () => {
    setSearchError('');
    if (!searchRollNo) return;
    const roll = parseInt(searchRollNo);
    const found = students.find(s => s.rollNo === roll);
    if (found) {
        setSelectedStudent(found);
    } else {
        setSearchError('Roll number not found');
    }
  };

  if (loading) return <div>Loading...</div>;

  const subjectGroups = config?.subjectGroups || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/browse')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
             <h1 className="text-2xl font-bold">{examId}</h1>
             <p className="text-gray-500 text-sm">{session} / {classId}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
            {!user && (
                <div className="flex items-center gap-2 flex-1 md:flex-none">
                    <Input
                        placeholder="Search Roll No..."
                        value={searchRollNo}
                        onChange={(e) => setSearchRollNo(e.target.value)}
                        className="w-32 md:w-40"
                    />
                    <Button variant="default" onClick={handleSearch} className="px-3">
                       <Search className="h-4 w-4" />
                    </Button>
                    {searchError && <span className="text-red-500 text-xs absolute mt-12">{searchError}</span>}
                </div>
            )}
            {!user ? (
               <Button variant="outline" onClick={() => navigate('/login')} className="flex items-center gap-2 shrink-0">
                  <UserCircle className="h-4 w-4" /> Admin
               </Button>
            ) : (
               <>
                  <Button variant="outline" onClick={() => setShowConfig(!showConfig)}>
                      {showConfig ? 'Hide Config' : 'Edit Config'}
                  </Button>
                  <Button onClick={saveAll} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save All'}
                  </Button>
               </>
            )}
        </div>
      </div>

      {user && showConfig && (
        <ExamParams config={config} onSave={handleConfigSave} />
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="w-20 sticky left-0 bg-white z-20 shadow-sm border-r align-bottom pb-4">Roll No</TableHead>
                <TableHead rowSpan={2} className="w-64 sticky left-20 bg-white z-20 shadow-sm border-r align-bottom pb-4">Name</TableHead>
                {subjectGroups.map((group, i) => (
                   group.tests.length > 0 && (
                     <TableHead key={i} colSpan={group.tests.length} className="text-center border-r border-b font-bold bg-gray-50">
                       {group.subjectName}
                     </TableHead>
                   )
                ))}
                <TableHead rowSpan={2} className="w-24 text-center font-bold border-l bg-gray-50 align-bottom pb-4">Total</TableHead>
                <TableHead rowSpan={2} className="w-24 text-center font-bold bg-gray-50 border-r align-bottom pb-4">%</TableHead>
                {user && <TableHead rowSpan={2} className="w-16 bg-white z-10"></TableHead>}
              </TableRow>
              <TableRow>
                {subjectGroups.map(group => (
                  group.tests.map(test => (
                    <TableHead key={test.id} className="min-w-[150px] text-center border-r bg-white top-10">
                      <div className="font-semibold text-gray-700">{test.name}</div>
                      <div className="text-xs text-gray-500">{test.date || 'No date'}</div>
                      <div className="text-xs text-blue-600">Full: {test.maxMarks}</div>
                    </TableHead>
                  ))
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, index) => (
                <TableRow key={index} className="hover:bg-gray-50/50">
                  <TableCell className="text-center sticky left-0 bg-white z-10 shadow-sm border-r">
                    {user ? (
                      <Input
                        type="number"
                        value={student.rollNo}
                        onChange={(e) => handleStudentChange(index, 'rollNo', parseInt(e.target.value))}
                        className="h-8 w-16 mx-auto text-center"
                      />
                    ) : (
                      <span className="font-medium">{student.rollNo}</span>
                    )}
                  </TableCell>
                  <TableCell className="sticky left-20 bg-white z-10 shadow-sm border-r">
                    {user ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={student.name}
                          onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                          className="h-8 flex-1"
                          placeholder="Student Name"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 shrink-0" onClick={() => setSelectedStudent(student)} title="View Marksheet">
                           <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 shrink-0" onClick={() => openGraph(student)} title="View Performance Graph">
                           <BarChart className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium flex-1">{student.name || 'Unnamed Student'}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 shrink-0" onClick={() => setSelectedStudent(student)} title="View Marksheet">
                           <FileText className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-500 shrink-0" onClick={() => openGraph(student)} title="View Performance Graph">
                           <BarChart className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>

                  {subjectGroups.map(group => (
                    group.tests.map(test => {
                      const marks = student.marks?.[test.id] ?? '';
                      const max = parseInt(test.maxMarks) || 0;
                      const perc = (marks !== '' && max > 0) ? ((parseInt(marks) / max) * 100).toFixed(0) : '-';

                      return (
                        <TableCell key={test.id} className="text-center p-2 border-r">
                          <div className="flex flex-col items-center gap-1">
                              {user ? (
                              <Input
                                  type="number"
                                  value={marks}
                                  onChange={(e) => handleMarkChange(index, test.id, e.target.value)}
                                  className="h-8 w-20 text-center"
                                  placeholder="-"
                              />
                              ) : (
                              <span className="text-base">{marks !== '' ? marks : '-'}</span>
                              )}
                              <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-1.5 rounded">{perc}%</span>
                          </div>
                        </TableCell>
                      );
                    })
                  ))}

                  <TableCell className="text-center font-bold text-blue-600 border-l bg-gray-50">
                    {calculateTotalObtained(student)}
                    <span className="text-xs text-gray-400 block font-normal">/ {calculateTotalMax()}</span>
                  </TableCell>
                  <TableCell className="text-center font-bold bg-gray-50 border-r">
                    {calculatePercentage(student)}%
                  </TableCell>

                  {user && (
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeStudent(index)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {user && (
            <div className="p-4 border-t bg-gray-50 sticky left-0">
              <Button variant="outline" onClick={addStudent} className="w-full sm:w-auto bg-white">
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MarksheetModal
        isOpen={!!selectedStudent && !isGraphOpen}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
        config={config}
        allStudents={students}
        sessionDetails={sessionDetails}
      />

      {selectedStudent && isGraphOpen && (
          <StudentGraphModal
             student={selectedStudent}
             graphData={graphData}
             isOpen={isGraphOpen}
             onClose={() => {
                 setIsGraphOpen(false);
                 setSelectedStudent(null);
             }}
             title={`Performance Overview: ${examId}`}
          />
      )}
    </div>
  );
}
