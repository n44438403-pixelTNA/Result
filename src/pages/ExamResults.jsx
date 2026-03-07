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

  const applyHolidayToTest = (testId, testName) => {
      if (confirm(`Are you sure you want to mark "${testName}" as a Holiday (X) for all students? This will overwrite existing marks for this specific test.`)) {
          const updatedStudents = students.map(student => {
              const updatedMarks = { ...student.marks };
              updatedMarks[testId] = 'X';
              return { ...student, marks: updatedMarks };
          });
          setStudents(updatedStudents);
          setHasUnsavedChanges(true);
      }
  };

  // Helper to get students with pre-calculated ranks based on current marks
  const handleDownloadFullReport = () => {
      const rankedList = getRankedStudents();
      const subjectGroups = config?.subjectGroups || [];
      const institute = sessionDetails?.instituteName || 'Institute / Coaching Name';
      const director = sessionDetails?.director || '';
      const est = sessionDetails?.est || '';
      const mobile = sessionDetails?.mobile || '';
      const address = sessionDetails?.address || '';

      // Calculate dashboard stats
      const totalStudents = rankedList.length;
      const classAvgPerc = totalStudents > 0
          ? (rankedList.reduce((acc, s) => acc + parseFloat(calculatePercentage(s)), 0) / totalStudents).toFixed(2)
          : 0;

      const validScores = rankedList.map(s => Number(s.totalObtained)).filter(n => !isNaN(n));
      const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;

      const validRankedStudents = [...rankedList].filter(s => !isNaN(Number(s.totalObtained)));
      const sortedByMarksDesc = [...validRankedStudents].sort((a, b) => b.totalObtained - a.totalObtained);
      const sortedByMarksAsc = [...validRankedStudents].sort((a, b) => a.totalObtained - b.totalObtained);

      const top5Scorers = sortedByMarksDesc.slice(0, 5);
      const lowest5Scorers = sortedByMarksAsc.slice(0, 5);

      const studentsWithAttendance = rankedList.map(s => ({ ...s, stats: getAttendanceStats(s) }));
      const sortedByPresentDesc = [...studentsWithAttendance].sort((a, b) => b.stats.present - a.stats.present);
      const sortedByAbsentDesc = [...studentsWithAttendance].sort((a, b) => b.stats.absent - a.stats.absent);

      const top5MostPresent = sortedByPresentDesc.slice(0, 5).filter(s => s.stats.present > 0);
      const top5MostAbsent = sortedByAbsentDesc.slice(0, 5).filter(s => s.stats.absent > 0);

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

      // Add Dashboard Stats
      html += `
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; justify-content: center;">
          <div style="border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.5rem; text-align: center; background: #fff; min-width: 150px;">
             <span style="font-size: 0.875rem; color: #6b7280;">Total Students</span><br/>
             <span style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${totalStudents}</span>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.5rem; text-align: center; background: #fff; min-width: 150px;">
             <span style="font-size: 0.875rem; color: #6b7280;">Class Average</span><br/>
             <span style="font-size: 1.5rem; font-weight: bold; color: #2563eb;">${classAvgPerc}%</span>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.5rem; text-align: center; background: #fff; min-width: 150px;">
             <span style="font-size: 0.875rem; color: #6b7280;">Highest Score</span><br/>
             <span style="font-size: 1.5rem; font-weight: bold; color: #16a34a;">${highestScore}</span>
          </div>
      </div>`;

      if (totalStudents > 0) {
          html += `<div style="display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; justify-content: center; max-width: 1000px; margin-left: auto; margin-right: auto;">
              <div style="flex: 0 1 220px; border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 0.5rem; background: #fff;">
                  <h3 style="font-size: 0.875rem; font-weight: bold; color: #15803d; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 0.5rem; margin-top: 0; text-align: center;">Top 5 Scorers</h3>
                  <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.8rem;">
                      ${top5Scorers.map(s => `<li style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px dashed #f3f4f6;"><span style="padding-right: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name || s.rollNo}</span><span style="font-weight: 600; white-space: nowrap;">${s.totalObtained} <span style="font-size: 0.7rem; color: #9ca3af; font-weight: normal;">(${calculatePercentage(s)}%)</span></span></li>`).join('')}
                  </ul>
              </div>
              <div style="flex: 0 1 220px; border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 0.5rem; background: #fff;">
                  <h3 style="font-size: 0.875rem; font-weight: bold; color: #b91c1c; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 0.5rem; margin-top: 0; text-align: center;">Lowest 5 Scorers</h3>
                  <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.8rem;">
                      ${lowest5Scorers.map(s => `<li style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px dashed #f3f4f6;"><span style="padding-right: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name || s.rollNo}</span><span style="font-weight: 600; white-space: nowrap;">${s.totalObtained} <span style="font-size: 0.7rem; color: #9ca3af; font-weight: normal;">(${calculatePercentage(s)}%)</span></span></li>`).join('')}
                  </ul>
              </div>
              <div style="flex: 0 1 220px; border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 0.5rem; background: #fff;">
                  <h3 style="font-size: 0.875rem; font-weight: bold; color: #6d28d9; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 0.5rem; margin-top: 0; text-align: center;">Most Present</h3>
                  <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.8rem;">
                      ${top5MostPresent.length > 0 ? top5MostPresent.map(s => `<li style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px dashed #f3f4f6;"><span style="padding-right: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name || s.rollNo}</span><span style="font-weight: 600; white-space: nowrap;">${s.stats.present}d</span></li>`).join('') : '<li style="color: #9ca3af; font-style: italic; text-align: center; padding-top: 0.5rem;">No attendance data</li>'}
                  </ul>
              </div>
              <div style="flex: 0 1 220px; border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 0.5rem; background: #fff;">
                  <h3 style="font-size: 0.875rem; font-weight: bold; color: #c2410c; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 0.5rem; margin-top: 0; text-align: center;">Most Absent</h3>
                  <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.8rem;">
                      ${top5MostAbsent.length > 0 ? top5MostAbsent.map(s => `<li style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px dashed #f3f4f6;"><span style="padding-right: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name || s.rollNo}</span><span style="font-weight: 600; white-space: nowrap;">${s.stats.absent}d</span></li>`).join('') : '<li style="color: #9ca3af; font-style: italic; text-align: center; padding-top: 0.5rem;">No absences recorded</li>'}
                  </ul>
              </div>
          </div>`;
      }

      html += `<table class="w-full">
          <thead>
              <tr class="bg-gray-100">
                  <th class="p-2 border" rowspan="2">Roll No</th>
                  <th class="p-2 border" rowspan="2">Name</th>`;

      subjectGroups.forEach(group => {
          html += `<th class="p-2 border" colspan="${group.tests.length}">${group.subjectName}</th>`;
      });

      html += `<th class="p-2 border" colspan="3">Attendance</th>
                  <th class="p-2 border" rowspan="2">Total Obt.</th>
                  <th class="p-2 border" rowspan="2">Max Marks</th>
                  <th class="p-2 border" rowspan="2">%</th>
                  <th class="p-2 border" rowspan="2">Grade</th>
                  <th class="p-2 border" rowspan="2">Rank</th>
              </tr>
              <tr class="bg-gray-50">`;

      subjectGroups.forEach(group => {
          group.tests.forEach(test => {
              html += `<th class="p-2 border text-xs">${test.name || test.id}<br><span class="font-normal text-blue-600">Full: ${test.maxMarks}</span></th>`;
          });
      });

      html += `<th class="p-2 border text-xs text-purple-700">Present</th>
                  <th class="p-2 border text-xs text-red-600">Absent</th>
                  <th class="p-2 border text-xs text-gray-500">Closed</th>
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
              <td class="text-center p-2 border font-bold">${student.rollNo}</td>
              <td class="p-2 border">${student.name || 'Unnamed'}</td>`;

          subjectGroups.forEach(group => {
              group.tests.forEach(test => {
                  const marks = student.marks?.[test.id] ?? '-';
                  const isHoliday = marks === 'X';
                  const displayMark = isHoliday ? 'Holiday' : marks;
                  const style = isHoliday ? 'color:#9ca3af;font-size:10px;' : (marks === 'A' ? 'color:#ef4444;font-weight:bold;' : '');
                  html += `<td class="text-center border p-2" style="${style}">${displayMark}</td>`;
              });
          });

          html += `   <td class="text-center p-2 border">${stats.present}</td>
              <td class="text-center p-2 border text-red-600 font-bold">${stats.absent}</td>
              <td class="text-center p-2 border text-gray-500">${stats.closed}</td>
              <td class="text-center p-2 border font-bold text-blue-700">${totalObt}</td>
              <td class="text-center p-2 border font-semibold">${totalMax}</td>
              <td class="text-center p-2 border font-bold">${perc}%</td>
              <td class="text-center p-2 border font-bold">${grade}</td>
              <td class="text-center p-2 border font-bold">#${student.rank}</td>
          </tr>`;
      });

      html += `</tbody></table>`;

      const fullHtmlContent = generateHTML(html, `${examId}_Full_Report`);
      downloadHTML(fullHtmlContent, `${examId}_Full_Report.html`);
  };

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
          return {
              ...s,
              rank: rankedVer ? rankedVer.rank : '-',
              totalObtained: rankedVer ? rankedVer.totalObtained : 0
          };
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

  const validScores = rankedStudentsList.map(s => Number(s.totalObtained)).filter(n => !isNaN(n));
  const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;

  // Detailed Top/Bottom Stats
  const validRankedStudents = [...rankedStudentsList].filter(s => !isNaN(Number(s.totalObtained)));
  const sortedByMarksDesc = [...validRankedStudents].sort((a, b) => b.totalObtained - a.totalObtained);
  const sortedByMarksAsc = [...validRankedStudents].sort((a, b) => a.totalObtained - b.totalObtained);

  const top5Scorers = sortedByMarksDesc.slice(0, 5);
  const lowest5Scorers = sortedByMarksAsc.slice(0, 5);

  const studentsWithAttendance = rankedStudentsList.map(s => ({ ...s, stats: getAttendanceStats(s) }));
  const sortedByPresentDesc = [...studentsWithAttendance].sort((a, b) => b.stats.present - a.stats.present);
  const sortedByAbsentDesc = [...studentsWithAttendance].sort((a, b) => b.stats.absent - a.stats.absent);

  const top5MostPresent = sortedByPresentDesc.slice(0, 5).filter(s => s.stats.present > 0);
  const top5MostAbsent = sortedByAbsentDesc.slice(0, 5).filter(s => s.stats.absent > 0);

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
      <div className="space-y-4 mb-4">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
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

          {totalStudents > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h3 className="text-sm font-bold text-green-700 border-b pb-2 mb-2">Top 5 Scorers</h3>
                      <ul className="space-y-1 text-sm">
                          {top5Scorers.map((s, i) => (
                              <li key={i} className="flex justify-between">
                                  <span className="truncate pr-2">{s.name || s.rollNo}</span>
                                  <span className="font-semibold">{s.totalObtained} <span className="text-xs text-gray-400 font-normal">({calculatePercentage(s)}%)</span></span>
                              </li>
                          ))}
                      </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h3 className="text-sm font-bold text-red-700 border-b pb-2 mb-2">Lowest 5 Scorers</h3>
                      <ul className="space-y-1 text-sm">
                          {lowest5Scorers.map((s, i) => (
                              <li key={i} className="flex justify-between">
                                  <span className="truncate pr-2">{s.name || s.rollNo}</span>
                                  <span className="font-semibold">{s.totalObtained} <span className="text-xs text-gray-400 font-normal">({calculatePercentage(s)}%)</span></span>
                              </li>
                          ))}
                      </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h3 className="text-sm font-bold text-purple-700 border-b pb-2 mb-2">Most Present</h3>
                      <ul className="space-y-1 text-sm">
                          {top5MostPresent.length > 0 ? top5MostPresent.map((s, i) => (
                              <li key={i} className="flex justify-between">
                                  <span className="truncate pr-2">{s.name || s.rollNo}</span>
                                  <span className="font-semibold">{s.stats.present}d</span>
                              </li>
                          )) : <li className="text-gray-400 italic">No attendance data</li>}
                      </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h3 className="text-sm font-bold text-orange-700 border-b pb-2 mb-2">Most Absent</h3>
                      <ul className="space-y-1 text-sm">
                          {top5MostAbsent.length > 0 ? top5MostAbsent.map((s, i) => (
                              <li key={i} className="flex justify-between">
                                  <span className="truncate pr-2">{s.name || s.rollNo}</span>
                                  <span className="font-semibold">{s.stats.absent}d</span>
                              </li>
                          )) : <li className="text-gray-400 italic">No absences recorded</li>}
                      </ul>
                  </div>
              </div>
          )}
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
                     <TableHead key={i} colSpan={group.tests.length} className="text-center border-r border-b font-bold bg-gray-50">
                       {group.subjectName}
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
                      {user && (
                          <div className="mt-1">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-[10px] px-1 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                  onClick={() => applyHolidayToTest(test.id, test.name)}
                                  title="Mark as Holiday for all"
                              >
                                  Set Holiday
                              </Button>
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
                                marks === 'X' ? (
                                   <div
                                      className="h-8 w-20 flex items-center justify-center border border-gray-200 bg-gray-100 text-gray-400 font-bold text-[10px] rounded cursor-not-allowed select-none"
                                      title="Holiday - Cannot be edited"
                                      onDoubleClick={() => {
                                          if (confirm("Remove Holiday marking for this student?")) {
                                              handleMarkChange(index, test.id, '');
                                          }
                                      }}
                                   >
                                       Holiday
                                   </div>
                                ) : (
                                  <Input
                                      type="text"
                                      value={marks}
                                      onChange={(e) => handleMarkChange(index, test.id, e.target.value)}
                                      className={`h-8 w-20 text-center ${marks === 'A' ? 'text-red-500 font-bold bg-red-50' : ''}`}
                                      placeholder="-"
                                      title="Enter marks, 'A' for Absent, 'X' for Class Closed"
                                  />
                                )
                              ) : (
                              <span className={`text-base ${marks === 'A' ? 'text-red-500 font-bold' : marks === 'X' ? 'text-gray-400 text-xs font-semibold' : ''}`}>
                                  {marks === 'X' ? 'Holiday' : marks !== '' ? marks : '-'}
                              </span>
                              )}
                              {perc !== '-' && <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-1.5 rounded">{perc}%</span>}
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
