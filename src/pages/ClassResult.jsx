import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Printer, FileText, BarChart } from 'lucide-react';
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Get all exams for this class
        const [examsList, details] = await Promise.all([
             db.getExams(session, classId),
             db.getSessionDetails(session)
        ]);
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

            <Table className="min-w-max">
                <TableHeader>
                <TableRow>
                    <TableHead className="w-16 sticky left-0 bg-white z-10 border-r">Roll</TableHead>
                    <TableHead className="w-48 sticky left-16 bg-white z-10 border-r">Name</TableHead>

                    {exams.map(exam => (
                    <TableHead key={exam} className="text-center border-r min-w-[100px]">
                        <div className="font-bold">{exam}</div>
                    </TableHead>
                    ))}

                    <TableHead className="w-24 text-center font-bold border-l bg-gray-50">Grand Total</TableHead>
                    <TableHead className="w-20 text-center font-bold bg-gray-50">%</TableHead>
                    <TableHead className="w-16 text-center font-bold bg-gray-50 border-r">Grade</TableHead>
                    <TableHead className="w-16 text-center font-bold bg-blue-50 text-blue-800 border-r">Rank</TableHead>
                    <TableHead className="w-24 text-center print:hidden">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredStudents.length === 0 && (
                   <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">No students found matching your search.</TableCell>
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
                        <TableRow key={student.rollNo} className={`hover:bg-gray-50/50 ${student.rank === 1 ? 'bg-yellow-50/30' : ''} ${student.rank === 2 ? 'bg-gray-50/80' : ''} ${student.rank === 3 ? 'bg-orange-50/30' : ''}`}>
                        <TableCell className="text-center sticky left-0 bg-white z-10 border-r font-medium">
                            {student.rollNo}
                        </TableCell>
                        <TableCell className="sticky left-16 bg-white z-10 border-r font-medium text-gray-900">
                            {student.name || 'Unnamed Student'}
                        </TableCell>

                        {exams.map(exam => {
                            const result = student.examTotals[exam];
                            if (!result) return <TableCell key={exam} className="text-center border-r text-gray-400">-</TableCell>;
                            return (
                                <TableCell key={exam} className="text-center border-r">
                                    <div className="font-medium">{result.obtained}</div>
                                    <div className="text-[10px] text-gray-500">/ {result.max}</div>
                                </TableCell>
                            );
                        })}

                        <TableCell className="text-center font-bold text-blue-700 border-l bg-gray-50">
                            {student.grandObtained}
                            <span className="text-xs text-gray-400 block font-normal">/ {student.grandMax}</span>
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
          />
      )}
    </div>
  );
}
