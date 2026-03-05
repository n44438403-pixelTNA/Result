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

  const [searchQuery, setSearchQuery] = useState('');
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

  const getGrade = (percentage) => {
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B+';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C';
      if (percentage >= 40) return 'D';
      return 'F';
  };

  // Helper to get students with pre-calculated ranks based on current marks
  const getRankedStudents = () => {
      if (!students || students.length === 0) return [];
      // Calculate total obtained for everyone
      const withTotals = students.map(s => ({
          ...s,
          totalObtained: calculateTotalObtained(s)
      }));

      // Sort descending by total
      const sorted = [...withTotals].sort((a, b) => b.totalObtained - a.totalObtained);

      // Assign ranks (handle ties)
      let currentRank = 1;
      for (let i = 0; i < sorted.length; i++) {
          if (i > 0 && sorted[i].totalObtained < sorted[i - 1].totalObtained) {
              currentRank = i + 1;
          }
          sorted[i].rank = currentRank;
      }

      // Merge back ranks into original array ordered by rollNo
      return students.map(s => {
          const rankedVer = sorted.find(rs => rs.rollNo === s.rollNo);
          return { ...s, rank: rankedVer ? rankedVer.rank : '-' };
      });
  };

  const getRankBadge = (rank) => {
      if (rank === 1) return <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap shadow-sm">🥇 1st</span>;
      if (rank === 2) return <span className="inline-flex items-center justify-center bg-gray-200 text-gray-800 border border-gray-400 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap shadow-sm">🥈 2nd</span>;
      if (rank === 3) return <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 border border-orange-300 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap shadow-sm">🥉 3rd</span>;
      if (rank <= 10) return <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap shadow-sm">Top 10 (Rank {rank})</span>;
      return <span className="text-gray-500 font-medium text-sm">{rank}</span>;
  };

  const openGraph = (student) => {
      if (!config?.subjectGroups) return;

      // View 1: Test-wise (Aggregated Timeline)
      const testAggregates = new Map();
      // View 2: Subject-wise (Aggregated by subject)
      const subjectAggregates = new Map();
      // View 3: Detailed All Tests (Grouped by Subject sequentially)
      const detailedTests = [];
      // View 4: Detailed All Tests Chronological (Sorted by date)
      const chronologicalTests = [];

      config.subjectGroups.forEach(group => {
          const subKey = group.subjectName;
          if (!subjectAggregates.has(subKey)) {
              subjectAggregates.set(subKey, { obtained: 0, max: 0, label: subKey });
          }
          const subAgg = subjectAggregates.get(subKey);

          group.tests.forEach(test => {
              const key = test.date || test.name;
              const marks = parseInt(student.marks?.[test.id]) || 0;
              const max = parseInt(test.maxMarks) || 0;
              const perc = max > 0 ? ((marks / max) * 100).toFixed(2) : 0;

              // Build raw detailed point
              const detailedPoint = {
                  label: `${subKey} - ${test.name}`,
                  percentage: perc,
                  date: test.date || '',
                  subject: subKey
              };

              if (max > 0) {
                 detailedTests.push(detailedPoint);
                 chronologicalTests.push(detailedPoint);
              }

              // Build aggregates
              if (!testAggregates.has(key)) {
                  testAggregates.set(key, { obtained: 0, max: 0, label: key });
              }
              const testAgg = testAggregates.get(key);
              testAgg.obtained += marks;
              testAgg.max += max;

              subAgg.obtained += marks;
              subAgg.max += max;
          });
      });

      const buildDataArray = (map) => {
          return Array.from(map.keys()).sort().map(key => {
              const agg = map.get(key);
              const perc = agg.max > 0 ? ((agg.obtained / agg.max) * 100).toFixed(2) : 0;
              return { label: agg.label, percentage: perc };
          });
      };

      // Sort chronological by date
      chronologicalTests.sort((a, b) => a.date.localeCompare(b.date));

      setGraphData({
          groupedBySubject: detailedTests,
          chronologicalTimeline: chronologicalTests,
          testAggregate: buildDataArray(testAggregates),
          subjectAggregate: buildDataArray(subjectAggregates)
      });
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

  const rankedStudentsList = getRankedStudents();

  // Apply live search filtering
  const filteredStudents = rankedStudentsList.filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (s.name && s.name.toLowerCase().includes(q)) ||
             (s.rollNo && s.rollNo.toString().includes(q));
  });

  // Calculate Summary Stats
  const totalStudents = rankedStudentsList.length;
  const classAvgPerc = totalStudents > 0
      ? (rankedStudentsList.reduce((acc, s) => acc + parseFloat(calculatePercentage(s)), 0) / totalStudents).toFixed(2)
      : 0;
  const highestScore = totalStudents > 0 ? Math.max(...rankedStudentsList.map(s => s.totalObtained)) : 0;

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
            <div className="flex items-center gap-2 flex-1 md:flex-none">
                <Search className="h-5 w-5 text-gray-400 hidden md:block" />
                <Input
                    placeholder="Filter by Name or Roll No..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64"
                />
            </div>
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

      {/* Summary Dashboard */}
      <div className="grid grid-cols-3 gap-4 mb-2">
         <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center">
            <span className="text-sm text-gray-500 font-medium">Total Students</span>
            <span className="text-2xl font-bold text-gray-800">{totalStudents}</span>
         </div>
         <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center">
            <span className="text-sm text-gray-500 font-medium">Class Average</span>
            <span className="text-2xl font-bold text-blue-600">{classAvgPerc}%</span>
         </div>
         <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center">
            <span className="text-sm text-gray-500 font-medium">Highest Score</span>
            <span className="text-2xl font-bold text-green-600">{highestScore}</span>
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
                <TableHead rowSpan={2} className="w-20 text-center font-bold bg-gray-50 align-bottom pb-4">%</TableHead>
                <TableHead rowSpan={2} className="w-16 text-center font-bold bg-gray-50 border-r align-bottom pb-4">Grade</TableHead>
                <TableHead rowSpan={2} className="w-24 text-center font-bold bg-blue-50 text-blue-800 border-r align-bottom pb-4">Rank</TableHead>
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
              {filteredStudents.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">No students found matching your search.</TableCell>
                 </TableRow>
              )}
              {filteredStudents.map((student, index) => {
                const perc = calculatePercentage(student);
                return (
                <TableRow key={index} className={`hover:bg-gray-50/50 ${student.rank === 1 ? 'bg-yellow-50/30' : ''} ${student.rank === 2 ? 'bg-gray-50/80' : ''} ${student.rank === 3 ? 'bg-orange-50/30' : ''}`}>
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
                  <TableCell className="text-center font-bold bg-gray-50">
                    {perc}%
                  </TableCell>
                  <TableCell className={`text-center font-bold border-r ${perc >= 90 ? 'text-green-600' : perc >= 70 ? 'text-blue-600' : perc >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {getGrade(perc)}
                  </TableCell>
                  <TableCell className="text-center bg-gray-50 border-r">
                    {getRankBadge(student.rank)}
                  </TableCell>

                  {user && (
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeStudent(index)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
                );
              })}
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
             datasets={graphData}
             isOpen={isGraphOpen}
             onClose={() => {
                 setIsGraphOpen(false);
                 setSelectedStudent(null);
             }}
             title={`Performance Overview: ${examId}`}
             sessionDetails={sessionDetails}
          />
      )}
    </div>
  );
}
