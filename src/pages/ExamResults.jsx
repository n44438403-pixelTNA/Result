import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Plus, Save, Trash, UserCircle, FileText, BarChart, Search, Maximize2, Minimize2 } from 'lucide-react';
import ExamParams from '../components/admin/ExamParams';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import MarksheetModal from '../components/MarksheetModal';
import StudentGraphModal from '../components/StudentGraphModal';
import { generateHTML, downloadHTML } from '../lib/html';

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
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [defaultMarks, setDefaultMarks] = useState({});

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

    // Allow special strings like 'A' (Absent) or 'X' (Class Closed), otherwise parse integer
    let parsedValue = value;
    if (value !== '') {
        const upperVal = value.toUpperCase();
        if (upperVal === 'A' || upperVal === 'X') {
            parsedValue = upperVal;
        } else {
            const intVal = parseInt(value);
            parsedValue = isNaN(intVal) ? '' : intVal;
        }
    }

    updated[index].marks = { ...updated[index].marks, [testId]: parsedValue };
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
            const mark = student.marks[test.id];
            if (mark !== 'A' && mark !== 'X') {
               sum += (parseInt(mark) || 0);
            }
        });
    });
    return sum;
  };

  const calculateTotalMax = (student) => {
      if (!config?.subjectGroups) return 0;
      let sum = 0;
      config.subjectGroups.forEach(group => {
          group.tests.forEach(test => {
              const mark = student?.marks?.[test.id];
              // Exclude test from max if class was closed (X) for this student/day
              if (mark !== 'X') {
                  sum += (parseInt(test.maxMarks) || 0);
              }
          });
      });
      return sum;
  };

  const getAttendanceStats = (student) => {
      if (!config?.subjectGroups) return { total: 0, present: 0, absent: 0, closed: 0 };

      let totalTests = 0;
      let absent = 0;
      let closed = 0;

      config.subjectGroups.forEach(group => {
          group.tests.forEach(test => {
              totalTests++;
              const mark = student?.marks?.[test.id];
              if (mark === 'A') {
                  absent++;
              } else if (mark === 'X') {
                  closed++;
              }
          });
      });

      // Present is total tests minus absent minus closed days
      const present = totalTests - absent - closed;

      return { total: totalTests, present, absent, closed };
  };

  const calculatePercentage = (student) => {
      const obtained = calculateTotalObtained(student);
      const max = calculateTotalMax(student);
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

  const applyDefaultMarksToSubject = (groupIndex) => {
      const group = config?.subjectGroups[groupIndex];
      if (!group || !group.tests || group.tests.length === 0) return;

      const marksValue = defaultMarks[groupIndex];
      if (marksValue === undefined || marksValue === '') return;

      let parsedValue = marksValue;
      const upperVal = marksValue.toUpperCase();
      if (upperVal === 'A' || upperVal === 'X') {
          parsedValue = upperVal;
      } else {
          const intVal = parseInt(marksValue);
          parsedValue = isNaN(intVal) ? '' : intVal;
      }

      if (confirm(`Are you sure you want to set default marks to "${parsedValue}" for all students in ${group.subjectName}? This will overwrite existing marks for these tests.`)) {
          const updatedStudents = students.map(student => {
              const updatedMarks = { ...student.marks };
              group.tests.forEach(test => {
                  updatedMarks[test.id] = parsedValue;
              });
              return { ...student, marks: updatedMarks };
          });
          setStudents(updatedStudents);
      }
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

  const handleDownloadFullReport = () => {
      const rankedList = getRankedStudents();
      const subjectGroups = config?.subjectGroups || [];
      const institute = sessionDetails?.instituteName || 'Institute / Coaching Name';
      const director = sessionDetails?.director || '';
      const est = sessionDetails?.est || '';
      const mobile = sessionDetails?.mobile || '';
      const address = sessionDetails?.address || '';

      let html = `<div class="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 class="text-3xl font-extrabold uppercase tracking-wider text-gray-900">${institute}</h1>
          <div class="text-sm font-semibold text-gray-600 mt-1 flex justify-center gap-4 flex-wrap">
            ${director ? `<span>Director: ${director}</span>` : ''}
            ${est ? `<span>Est: ${est}</span>` : ''}
            ${mobile ? `<span>Mob: ${mobile}</span>` : ''}
          </div>
          ${address ? `<div class="text-sm text-gray-700 mt-1 font-medium">${address}</div>` : ''}
          <div class="mt-4 pt-2 border-t border-gray-300">
             <h2 class="text-xl font-bold text-gray-800">Exam Result: ${examId}</h2>
             <p class="text-md text-gray-600 font-medium">Session: ${session} | Class: ${classId}</p>
          </div>
      </div>`;

      html += `<table class="w-full">
          <thead>
              <tr>
                  <th>Roll No</th>
                  <th>Name</th>`;

      subjectGroups.forEach(group => {
          group.tests.forEach(test => {
              html += `<th>${group.subjectName} - ${test.name} (Max: ${test.maxMarks})</th>`;
          });
      });

      html += `   <th>Present</th>
                  <th>Absent</th>
                  <th>Closed</th>
                  <th>Total Obtained</th>
                  <th>Total Max</th>
                  <th>Percentage</th>
                  <th>Grade</th>
                  <th>Rank</th>
              </tr>
          </thead>
          <tbody>`;

      rankedList.forEach(student => {
          const stats = getAttendanceStats(student);
          const totalObt = calculateTotalObtained(student);
          const totalMax = calculateTotalMax(student);
          const perc = calculatePercentage(student);
          const grade = getGrade(perc);

          html += `<tr>
              <td class="text-center">${student.rollNo}</td>
              <td>${student.name || 'Unnamed'}</td>`;

          subjectGroups.forEach(group => {
              group.tests.forEach(test => {
                  const marks = student.marks?.[test.id] ?? '-';
                  html += `<td class="text-center">${marks}</td>`;
              });
          });

          html += `   <td class="text-center">${stats.present}</td>
              <td class="text-center text-red-600 font-bold">${stats.absent}</td>
              <td class="text-center">${stats.closed}</td>
              <td class="text-center font-bold">${totalObt}</td>
              <td class="text-center font-bold">${totalMax}</td>
              <td class="text-center font-bold">${perc}%</td>
              <td class="text-center font-bold">${grade}</td>
              <td class="text-center font-bold">${student.rank}</td>
          </tr>`;
      });

      html += `</tbody></table>`;

      const fullHtmlContent = generateHTML(html, `${examId}_Full_Report`);
      downloadHTML(fullHtmlContent, `${examId}_Full_Report.html`);
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
            <Button
                variant={isFullScreenMode ? "default" : "outline"}
                onClick={() => setIsFullScreenMode(!isFullScreenMode)}
                className="shrink-0"
                title="Toggle Full Screen (Anonymous) Mode"
            >
                {isFullScreenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {!user ? (
               <Button variant="outline" onClick={() => navigate('/login')} className="flex items-center gap-2 shrink-0">
                  <UserCircle className="h-4 w-4" /> Admin
               </Button>
            ) : (
               <>
                  <Button variant="outline" onClick={handleDownloadFullReport} className="shrink-0 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200">
                      <FileText className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Download Report</span>
                  </Button>
                  <Button variant="outline" onClick={() => setShowConfig(!showConfig)} className="shrink-0">
                      {showConfig ? 'Hide Config' : 'Edit Config'}
                  </Button>
                  <Button onClick={saveAll} disabled={isSaving} className="shrink-0">
                      <Save className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save All'}</span>
                  </Button>
               </>
            )}
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-2">
         <div className="bg-white p-2 md:p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs md:text-sm text-gray-500 font-medium">Total Students</span>
            <span className="text-lg md:text-2xl font-bold text-gray-800">{totalStudents}</span>
         </div>
         <div className="bg-white p-2 md:p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs md:text-sm text-gray-500 font-medium">Class Average</span>
            <span className="text-lg md:text-2xl font-bold text-blue-600">{classAvgPerc}%</span>
         </div>
         <div className="bg-white p-2 md:p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs md:text-sm text-gray-500 font-medium">Highest Score</span>
            <span className="text-lg md:text-2xl font-bold text-green-600">{highestScore}</span>
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
                {!isFullScreenMode && (
                    <TableHead rowSpan={2} className="w-64 sticky left-20 bg-white z-20 shadow-sm border-r align-bottom pb-4">Name</TableHead>
                )}
                {subjectGroups.map((group, i) => (
                   group.tests.length > 0 && (
                     <TableHead key={i} colSpan={group.tests.length} className="text-center border-r border-b font-bold bg-gray-50 p-2">
                       <div className="flex flex-col items-center justify-center gap-1">
                           <span>{group.subjectName}</span>
                           {user && (
                               <div className="flex items-center gap-1 mt-1 justify-center w-full">
                                   <Input
                                       type="text"
                                       placeholder="Default Marks"
                                       className="h-6 text-xs text-center w-24 bg-white"
                                       value={defaultMarks[i] || ''}
                                       onChange={(e) => setDefaultMarks({...defaultMarks, [i]: e.target.value})}
                                   />
                                   <Button
                                       variant="outline"
                                       size="sm"
                                       className="h-6 text-[10px] px-2"
                                       onClick={() => applyDefaultMarksToSubject(i)}
                                   >
                                       Set
                                   </Button>
                               </div>
                           )}
                       </div>
                     </TableHead>
                   )
                ))}
                <TableHead colSpan={3} className="text-center font-bold border-l border-b bg-purple-50 text-purple-800">Attendance</TableHead>
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
                      {test.closedReason && (
                          <div className="text-[10px] text-red-500 font-medium mt-1 bg-red-50 px-1 rounded inline-block truncate max-w-full" title={test.closedReason}>
                              {test.closedReason}
                          </div>
                      )}
                    </TableHead>
                  ))
                ))}
                <TableHead className="w-16 text-center text-xs font-semibold bg-white border-l border-r text-purple-700">Present</TableHead>
                <TableHead className="w-16 text-center text-xs font-semibold bg-white border-r text-red-600">Absent</TableHead>
                <TableHead className="w-16 text-center text-xs font-semibold bg-white border-r text-gray-500" title="Class Closed">Closed</TableHead>
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
                    {/* Action buttons embedded here if Full Screen Mode is active */}
                    {isFullScreenMode && (
                         <div className="flex items-center justify-center gap-1 mt-1">
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500" onClick={() => setSelectedStudent(student)} title="View Marksheet">
                                <FileText className="h-3 w-3" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-500" onClick={() => openGraph(student)} title="View Performance Graph">
                                <BarChart className="h-3 w-3" />
                             </Button>
                         </div>
                    )}
                  </TableCell>
                  {!isFullScreenMode && (
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
                  )}

                  {subjectGroups.map(group => (
                    group.tests.map(test => {
                      const marks = student.marks?.[test.id] ?? '';
                      const max = parseInt(test.maxMarks) || 0;
                      let perc = '-';
                      if (marks === 'A') {
                          perc = '0';
                      } else if (marks === 'X') {
                          perc = '-';
                      } else if (marks !== '' && max > 0) {
                          perc = ((parseInt(marks) / max) * 100).toFixed(0);
                      }

                      return (
                        <TableCell key={test.id} className="text-center p-2 border-r">
                          <div className="flex flex-col items-center gap-1">
                              {user ? (
                              <Input
                                  type="text"
                                  value={marks}
                                  onChange={(e) => handleMarkChange(index, test.id, e.target.value)}
                                  className={`h-8 w-20 text-center ${marks === 'A' ? 'text-red-500 font-bold bg-red-50' : marks === 'X' ? 'text-gray-500 font-bold bg-gray-100' : ''}`}
                                  placeholder="-"
                                  title="Enter marks, 'A' for Absent, 'X' for Class Closed"
                              />
                              ) : (
                              <span className={`text-base ${marks === 'A' ? 'text-red-500 font-bold' : marks === 'X' ? 'text-gray-500 font-bold' : ''}`}>
                                  {marks !== '' ? marks : '-'}
                              </span>
                              )}
                              <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-1.5 rounded">{perc}{perc !== '-' ? '%' : ''}</span>
                          </div>
                        </TableCell>
                      );
                    })
                  ))}

                  {/* Attendance Columns */}
                  <TableCell className="text-center font-semibold text-purple-700 border-l bg-purple-50/30">
                     {getAttendanceStats(student).present}
                  </TableCell>
                  <TableCell className="text-center font-bold text-red-600 bg-red-50/30 border-l border-r">
                     {getAttendanceStats(student).absent}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-gray-500 bg-gray-50 border-r">
                     {getAttendanceStats(student).closed}
                  </TableCell>

                  <TableCell className="text-center font-bold text-blue-600 border-l bg-gray-50">
                    {calculateTotalObtained(student)}
                    <span className="text-xs text-gray-400 block font-normal">/ {calculateTotalMax(student)}</span>
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
