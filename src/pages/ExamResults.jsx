import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Plus, Save, Trash, UserCircle, FileText } from 'lucide-react';
import ExamParams from '../components/admin/ExamParams';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import MarksheetModal from '../components/MarksheetModal';

export default function ExamResults() {
  const { user } = useAuth();
  const { session, classId, examId } = useParams();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [cfg, stu] = await Promise.all([
        db.getExamConfig(session, classId, examId),
        db.getStudents(session, classId, examId)
      ]);

      let finalConfig = cfg;
      // Auto-migrate old formats for local state rendering immediately
      if (!cfg?.tests && cfg?.subjects) {
          finalConfig = {
              tests: cfg.subjects.map((sub, i) => ({
                 id: `test_mig_${i}`,
                 name: sub,
                 maxMarks: cfg.maxMarks || 100,
                 date: ''
              }))
          };
      } else if (!cfg) {
          finalConfig = { tests: [] };
      }

      setConfig(finalConfig);
      // Sort students by roll number
      const sortedStudents = (stu || []).sort((a, b) => a.rollNo - b.rollNo);
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
    if (!student.marks || !config?.tests) return 0;
    return config.tests.reduce((sum, test) => sum + (parseInt(student.marks[test.id]) || 0), 0);
  };

  const calculateTotalMax = () => {
      if (!config?.tests) return 0;
      return config.tests.reduce((sum, test) => sum + (parseInt(test.maxMarks) || 0), 0);
  };

  const calculatePercentage = (student) => {
      const obtained = calculateTotalObtained(student);
      const max = calculateTotalMax();
      return max > 0 ? ((obtained / max) * 100).toFixed(2) : 0;
  };

  if (loading) return <div>Loading...</div>;

  const tests = config?.tests || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/browse')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
             <h1 className="text-2xl font-bold">{examId}</h1>
             <p className="text-gray-500 text-sm">{session} / {classId}</p>
          </div>
        </div>
        <div className="flex gap-2">
            {!user ? (
               <Button variant="outline" onClick={() => navigate('/login')} className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" /> Admin Login / Edit
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
                <TableHead className="w-20 sticky left-0 bg-white z-10 shadow-sm border-r">Roll No</TableHead>
                <TableHead className="w-64 sticky left-20 bg-white z-10 shadow-sm border-r">Name</TableHead>
                {tests.map(test => (
                  <TableHead key={test.id} className="min-w-[150px] text-center border-r">
                    <div className="font-bold">{test.name}</div>
                    <div className="text-xs text-gray-500">{test.date || 'No date'}</div>
                    <div className="text-xs text-blue-600">Full: {test.maxMarks}</div>
                  </TableHead>
                ))}
                <TableHead className="w-24 text-center font-bold border-l bg-gray-50">Total</TableHead>
                <TableHead className="w-24 text-center font-bold bg-gray-50 border-r">%</TableHead>
                {user && <TableHead className="w-16"></TableHead>}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 shrink-0" onClick={() => setSelectedStudent(student)}>
                           <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedStudent(student)} className="font-medium text-blue-600 hover:underline flex items-center gap-2 w-full text-left">
                         {student.name || 'Unnamed Student'} <FileText className="h-3 w-3" />
                      </button>
                    )}
                  </TableCell>

                  {tests.map(test => {
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
                  })}

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
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
        config={config}
        allStudents={students}
      />
    </div>
  );
}
