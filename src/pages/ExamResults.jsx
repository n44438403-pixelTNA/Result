import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Plus, Save, Trash, UserCircle } from 'lucide-react';
import ExamParams from '../components/admin/ExamParams';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';

export default function ExamResults() {
  const { user } = useAuth();
  const { session, classId, examId } = useParams();
  const navigate = useNavigate();
  
  const [config, setConfig] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [cfg, stu] = await Promise.all([
        db.getExamConfig(session, classId, examId),
        db.getStudents(session, classId, examId)
      ]);
      
      setConfig(cfg || { maxMarks: 100, subjects: [] });
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

  const handleMarkChange = (index, subject, value) => {
    const updated = [...students];
    if (!updated[index].marks) updated[index].marks = {};
    updated[index].marks = { ...updated[index].marks, [subject]: parseInt(value) || 0 };
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

  const calculateTotal = (student) => {
    if (!student.marks) return 0;
    return Object.values(student.marks).reduce((sum, m) => sum + (parseInt(m) || 0), 0);
  };
  
  const calculatePercentage = (student) => {
      if (!config || !config.subjects || config.subjects.length === 0) return 0;
      const total = calculateTotal(student);
      const maxTotal = config.maxMarks * config.subjects.length;
      return maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : 0;
  };

  if (loading) return <div>Loading...</div>;

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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Roll No</TableHead>
                <TableHead className="w-64">Name</TableHead>
                {config.subjects.map(sub => (
                  <TableHead key={sub} className="w-24 text-center">{sub}</TableHead>
                ))}
                <TableHead className="w-24 text-center font-bold">Total</TableHead>
                <TableHead className="w-24 text-center font-bold">%</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center">
                    {user ? (
                      <Input
                        type="number"
                        value={student.rollNo}
                        onChange={(e) => handleStudentChange(index, 'rollNo', parseInt(e.target.value))}
                        className="h-8"
                      />
                    ) : (
                      <span>{student.rollNo}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user ? (
                      <Input
                        value={student.name}
                        onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                        className="h-8"
                        placeholder="Student Name"
                      />
                    ) : (
                      <span className="font-medium">{student.name}</span>
                    )}
                  </TableCell>
                  {config.subjects.map(sub => (
                    <TableCell key={sub} className="text-center p-1">
                      {user ? (
                        <Input
                          type="number"
                          value={student.marks?.[sub] ?? ''}
                          onChange={(e) => handleMarkChange(index, sub, e.target.value)}
                          className="h-8 text-center"
                          placeholder="-"
                        />
                      ) : (
                        <span>{student.marks?.[sub] ?? '-'}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-medium">
                    {calculateTotal(student)}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {calculatePercentage(student)}%
                  </TableCell>
                  <TableCell className="text-center">
                    {user && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeStudent(index)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {user && (
            <div className="p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={addStudent} className="w-full bg-white">
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
