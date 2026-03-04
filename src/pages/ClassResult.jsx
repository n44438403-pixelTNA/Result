import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import ClassMarksheetModal from '../components/ClassMarksheetModal';

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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Aggregate Results...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/browse')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
             <h1 className="text-2xl font-bold">Overall Class Result</h1>
             <p className="text-gray-500 text-sm">{session} / {classId}</p>
          </div>
        </div>
        <div>
           <Button variant="outline" onClick={() => window.print()}>
               <Printer className="mr-2 h-4 w-4" /> Print Results
           </Button>
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
                    <TableHead className="w-20 text-center font-bold bg-gray-50 border-r">%</TableHead>
                    <TableHead className="w-16 text-center font-bold bg-blue-50 text-blue-800 border-r">Rank</TableHead>
                    <TableHead className="w-24 text-center print:hidden">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {aggregatedStudents.map((student) => {
                    const perc = student.grandMax > 0 ? ((student.grandObtained / student.grandMax) * 100).toFixed(2) : 0;
                    return (
                        <TableRow key={student.rollNo} className="hover:bg-gray-50/50">
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
                        <TableCell className="text-center font-bold bg-gray-50 border-r">
                            {perc}%
                        </TableCell>
                        <TableCell className="text-center font-black text-blue-800 bg-blue-50 text-lg border-r">
                            {student.rank}
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                             <Button variant="ghost" size="sm" onClick={() => openMarksheet(student)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                <FileText className="h-4 w-4 mr-1" /> Marksheet
                             </Button>
                        </TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      )}

      {selectedStudent && (
          <ClassMarksheetModal
             student={selectedStudent}
             exams={exams}
             isOpen={isMarksheetOpen}
             onClose={() => setIsMarksheetOpen(false)}
             allStudents={aggregatedStudents}
             sessionDetails={sessionDetails}
          />
      )}
    </div>
  );
}
