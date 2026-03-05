import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Printer, FileText, BarChart, Search } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import ClassMarksheetModal from '../components/ClassMarksheetModal';
import StudentGraphModal from '../components/StudentGraphModal';

export default function ClassResult() {
  const { session, classId } = useParams();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [examConfigs, setExamConfigs] = useState({});
  const [aggregatedStudents, setAggregatedStudents] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isMarksheetOpen, setIsMarksheetOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [graphData, setGraphData] = useState({});

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Get all exams for this class
        const examsList = await db.getExams(session, classId);
        const details = await db.getSessionDetails(session);
        setExams(examsList);
        setSessionDetails(details);

        const configsMap = {};
        const studentsMap = {}; // { rollNo: { rollNo, name, examTotals: { 'Annual': { obtained, max } }, examDetails: { 'Annual': { marks: {}, config: {} } }, grandObtained, grandMax } }

        // 2. Fetch config and students for each exam
        for (const examId of examsList) {
            const [cfg, stuList] = await Promise.all([
                db.getExamConfig(session, classId, examId),
                db.getStudents(session, classId, examId)
            ]);

            let finalConfig = cfg || { subjectGroups: [] };

            // Handle legacy config formats just in case
            if (cfg && !cfg.subjectGroups) {
              if (cfg.tests && Array.isArray(cfg.tests)) {
                  finalConfig = { subjectGroups: [{ subjectName: 'General', tests: cfg.tests }] };
              } else if (cfg.subjects && Array.isArray(cfg.subjects)) {
                  finalConfig = {
                      subjectGroups: cfg.subjects.map((sub, i) => ({
                         subjectName: sub,
                         tests: [{ id: `test_mig_${i}`, maxMarks: cfg.maxMarks || 100 }]
                      }))
                  };
              }
            }

            configsMap[examId] = finalConfig;

            // Calculate max marks for this exam
            let examMaxMarks = 0;
            (finalConfig.subjectGroups || []).forEach(group => {
                (group.tests || []).forEach(test => {
                    examMaxMarks += parseInt(test.maxMarks) || 0;
                });
            });

            // Process students
            (stuList || []).forEach(student => {
                if (!studentsMap[student.rollNo]) {
                    studentsMap[student.rollNo] = {
                        rollNo: student.rollNo,
                        name: student.name,
                        examTotals: {},
                        examDetails: {}, // store raw details for individual marksheets
                        grandObtained: 0,
                        grandMax: 0
                    };
                }

                // Update name to latest known
                if (student.name) studentsMap[student.rollNo].name = student.name;

                // Calculate obtained for this exam
                let examObtained = 0;
                (finalConfig.subjectGroups || []).forEach(group => {
                    (group.tests || []).forEach(test => {
                        examObtained += parseInt(student.marks?.[test.id]) || 0;
                    });
                });

                studentsMap[student.rollNo].examTotals[examId] = {
                    obtained: examObtained,
                    max: examMaxMarks
                };

                studentsMap[student.rollNo].examDetails[examId] = {
                    marks: student.marks || {},
                    config: finalConfig
                };

                studentsMap[student.rollNo].grandObtained += examObtained;
                studentsMap[student.rollNo].grandMax += examMaxMarks;
            });
        }

        setExamConfigs(configsMap);

        // Convert map to array and sort by total obtained (for rank) and then by roll no
        const finalArray = Object.values(studentsMap);
        finalArray.sort((a, b) => b.grandObtained - a.grandObtained);

        // Assign ranks
        finalArray.forEach((student, index) => {
            student.rank = index + 1;
        });

        // Re-sort by roll number for clean presentation
        finalArray.sort((a, b) => a.rollNo - b.rollNo);

        setAggregatedStudents(finalArray);

      } catch (error) {
        console.error("Failed to load class aggregate results", error);
      }
      setLoading(false);
    };

    loadData();
  }, [session, classId]);

  const openMarksheet = (student) => {
      setSelectedStudent(student);
      setIsMarksheetOpen(true);
  };

  const openGraph = (student) => {
      // Build a timeline for all exams overall
      const timelineData = [];
      exams.forEach(exam => {
          const result = student.examTotals[exam];
          if (result && result.max > 0) {
              const perc = ((result.obtained / result.max) * 100).toFixed(2);
              timelineData.push({ label: exam, percentage: perc });
          }
      });

      setGraphData({
          overallTimeline: timelineData
      });
      setSelectedStudent(student);
      setIsGraphOpen(true);
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Aggregate Results...</div>;

  // Apply live search filtering
  const filteredStudents = aggregatedStudents.filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (s.name && s.name.toLowerCase().includes(q)) ||
             (s.rollNo && s.rollNo.toString().includes(q));
  });

  // Calculate Summary Stats
  const totalStudents = aggregatedStudents.length;
  const classAvgPerc = totalStudents > 0
      ? (aggregatedStudents.reduce((acc, s) => acc + (s.grandMax > 0 ? (s.grandObtained / s.grandMax) * 100 : 0), 0) / totalStudents).toFixed(2)
      : 0;
  const highestScore = totalStudents > 0 ? Math.max(...aggregatedStudents.map(s => s.grandObtained)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/browse')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
             <h1 className="text-2xl font-bold">Overall Class Result</h1>
             <p className="text-gray-500 text-sm">{session} / {classId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400 hidden md:block" />
            <Input
                placeholder="Filter by Name or Roll No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64"
            />
            <Button variant="outline" onClick={() => window.print()} className="ml-2">
                <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-3 gap-4 mb-2 print:hidden">
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

      {exams.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded shadow-sm border">
              No exams found for this class.
          </div>
      ) : (
        <Card className="print:shadow-none print:border-none">
            <CardContent className="p-0 overflow-x-auto print:overflow-visible">

            {/* Print Header */}
            <div className="hidden print:block text-center py-6 border-b mb-4">
                <h1 className="text-3xl font-bold">Class Performance Report</h1>
                <p className="text-lg text-gray-600">Session: {session} | Class: {classId}</p>
            </div>

            <Table className="min-w-max border-collapse border border-gray-200">
                <TableHeader>
                {/* Level 1 Headers: Exams */}
                <TableRow>
                    <TableHead rowSpan={3} className="w-16 sticky left-0 bg-gray-100 z-30 border align-bottom text-center">Roll</TableHead>
                    <TableHead rowSpan={3} className="w-48 sticky left-16 bg-gray-100 z-30 border align-bottom text-center">Student Name</TableHead>

                    {exams.map(exam => {
                        const examConfig = examConfigs[exam];
                        // Calculate total number of tests in this exam across all subjects
                        let totalTestsInExam = 0;
                        if (examConfig?.subjectGroups) {
                            examConfig.subjectGroups.forEach(g => {
                                totalTestsInExam += (g.tests || []).length;
                            });
                        }
                        if (totalTestsInExam === 0) totalTestsInExam = 1; // Fallback if empty config

                        return (
                            <TableHead key={exam} colSpan={totalTestsInExam} className="text-center border-r border-b border-gray-300 font-black text-gray-800 bg-gray-50 uppercase tracking-wider py-3">
                                {exam}
                            </TableHead>
                        );
                    })}

                    <TableHead rowSpan={3} className="w-24 text-center font-bold border bg-gray-100 align-bottom">Grand Total</TableHead>
                    <TableHead rowSpan={3} className="w-20 text-center font-bold border bg-gray-100 align-bottom">%</TableHead>
                    <TableHead rowSpan={3} className="w-16 text-center font-bold border bg-gray-100 align-bottom">Grade</TableHead>
                    <TableHead rowSpan={3} className="w-16 text-center font-bold bg-blue-100 text-blue-900 border align-bottom">Class Rank</TableHead>
                    <TableHead rowSpan={3} className="w-24 text-center print:hidden bg-gray-100 border align-bottom">Actions</TableHead>
                </TableRow>

                {/* Level 2 Headers: Subjects */}
                <TableRow>
                    {exams.map(exam => {
                        const examConfig = examConfigs[exam];
                        if (!examConfig?.subjectGroups || examConfig.subjectGroups.length === 0) {
                            return <TableHead key={`empty-sub-${exam}`} className="border-r border-b bg-white">-</TableHead>;
                        }
                        return examConfig.subjectGroups.map((group, gIdx) => {
                            if (!group.tests || group.tests.length === 0) return null;
                            return (
                                <TableHead key={`${exam}-sub-${gIdx}`} colSpan={(group.tests || []).length} className="text-center border-r border-b font-bold bg-indigo-50/50 text-indigo-900">
                                    {group.subjectName}
                                </TableHead>
                            );
                        });
                    })}
                </TableRow>

                {/* Level 3 Headers: Tests */}
                <TableRow>
                    {exams.map(exam => {
                        const examConfig = examConfigs[exam];
                        if (!examConfig?.subjectGroups || examConfig.subjectGroups.length === 0) {
                            return <TableHead key={`empty-test-${exam}`} className="border-r bg-white">-</TableHead>;
                        }
                        return examConfig.subjectGroups.map(group => {
                            return (group.tests || []).map(test => (
                                <TableHead key={`${exam}-${test.id}`} className="min-w-[120px] text-center border-r bg-white align-top pt-2">
                                    <div className="font-semibold text-gray-700 leading-tight">{test.name}</div>
                                    <div className="text-[10px] text-blue-600 font-bold mt-1">Max: {test.maxMarks}</div>
                                </TableHead>
                            ));
                        });
                    })}
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredStudents.length === 0 && (
                   <TableRow>
                      <TableCell colSpan={100} className="text-center py-8 text-gray-500">No students found matching your search.</TableCell>
                   </TableRow>
                )}
                {filteredStudents.map((student) => {
                    const perc = student.grandMax > 0 ? ((student.grandObtained / student.grandMax) * 100).toFixed(2) : 0;

                    const getRankBadge = (rank) => {
                        if (rank === 1) return <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full px-2 py-0.5 text-sm font-bold whitespace-nowrap shadow-sm">🥇 1st</span>;
                        if (rank === 2) return <span className="inline-flex items-center justify-center bg-gray-200 text-gray-800 border border-gray-400 rounded-full px-2 py-0.5 text-sm font-bold whitespace-nowrap shadow-sm">🥈 2nd</span>;
                        if (rank === 3) return <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 border border-orange-300 rounded-full px-2 py-0.5 text-sm font-bold whitespace-nowrap shadow-sm">🥉 3rd</span>;
                        if (rank <= 10) return <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-sm font-bold whitespace-nowrap shadow-sm">Top 10 (#{rank})</span>;
                        return <span className="text-gray-600 font-bold">{rank}</span>;
                    };

                    return (
                        <TableRow key={student.rollNo} className={`hover:bg-gray-50/80 transition-colors ${student.rank === 1 ? 'bg-yellow-50/40' : ''} ${student.rank === 2 ? 'bg-gray-50' : ''} ${student.rank === 3 ? 'bg-orange-50/40' : ''}`}>
                        <TableCell className="text-center sticky left-0 bg-white z-20 border font-bold text-gray-700 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            {student.rollNo}
                        </TableCell>
                        <TableCell className="sticky left-16 bg-white z-20 border font-bold text-gray-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap">
                            {student.name || 'Unnamed Student'}
                        </TableCell>

                        {exams.map(exam => {
                            const examConfig = examConfigs[exam];
                            const studentExamData = student.examDetails[exam];

                            if (!examConfig?.subjectGroups || examConfig.subjectGroups.length === 0) {
                                return <TableCell key={`empty-mark-${exam}`} className="text-center border-r text-gray-300">-</TableCell>;
                            }

                            return examConfig.subjectGroups.map(group => {
                                return (group.tests || []).map(test => {
                                    // Extract marks dynamically from the stored exam details for this specific student and test
                                    const marks = studentExamData?.marks?.[test.id];
                                    const hasMarks = marks !== undefined && marks !== '';
                                    const max = parseInt(test.maxMarks) || 0;
                                    const val = hasMarks ? parseInt(marks) : null;
                                    const isFail = val !== null && max > 0 && (val / max) < 0.4; // Highlight fails in red text

                                    return (
                                        <TableCell key={`${exam}-${test.id}`} className="text-center border-r border-b border-gray-200">
                                            <span className={`text-base font-medium ${isFail ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                                                {hasMarks ? marks : <span className="text-gray-300">-</span>}
                                            </span>
                                        </TableCell>
                                    );
                                });
                            });
                        })}

                        <TableCell className="text-center font-black text-indigo-700 border bg-indigo-50/30">
                            {student.grandObtained}
                            <span className="text-xs text-indigo-400 font-bold block">/ {student.grandMax}</span>
                        </TableCell>
                        <TableCell className="text-center font-bold bg-gray-50">
                            {perc}%
                        </TableCell>
                        <TableCell className={`text-center font-bold border-r ${perc >= 90 ? 'text-green-600' : perc >= 70 ? 'text-blue-600' : perc >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {getGrade(perc)}
                        </TableCell>
                        <TableCell className="text-center font-black text-blue-800 bg-blue-50/50 border-r">
                            {getRankBadge(student.rank)}
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                             <div className="flex items-center justify-center gap-2">
                                 <Button variant="ghost" size="sm" onClick={() => openMarksheet(student)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Marksheet">
                                    <FileText className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={() => openGraph(student)} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" title="Performance Graph">
                                    <BarChart className="h-4 w-4" />
                                 </Button>
                             </div>
                        </TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      )}

      {selectedStudent && isMarksheetOpen && (
          <ClassMarksheetModal
             student={selectedStudent}
             exams={exams}
             isOpen={isMarksheetOpen}
             onClose={() => {
                 setIsMarksheetOpen(false);
                 setSelectedStudent(null);
             }}
             allStudents={aggregatedStudents}
             sessionDetails={sessionDetails}
          />
      )}

      {selectedStudent && isGraphOpen && (
          <StudentGraphModal
             student={selectedStudent}
             datasets={graphData}
             isOpen={isGraphOpen}
             onClose={() => {
                 setIsGraphOpen(false);
                 setSelectedStudent(null);
             }}
             title={`Overall Performance Trend (All Exams)`}
             sessionDetails={sessionDetails}
          />
      )}
    </div>
  );
}
