import React, { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Download, Printer, X, FileText, LayoutList } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/Table';

// Helper to generate MHTML
function generateMHTML(htmlContent, title) {
  const mhtml = [
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="----MultipartBoundary--"`,
    "",
    "------MultipartBoundary--",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    `<title>${title}</title>`,
    "<style>",
    "body { font-family: sans-serif; padding: 20px; }",
    "table { width: 100%; border-collapse: collapse; margin-top: 20px; }",
    "th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }",
    "th { background-color: #f2f2f2; }",
    ".text-right { text-align: right; }",
    ".font-bold { font-weight: bold; }",
    ".text-center { text-align: center; }",
    ".bg-gray-50 { background-color: #f9fafb; }",
    ".bg-blue-50 { background-color: #eff6ff; }",
    "</style>",
    "</head>",
    "<body>",
    htmlContent,
    "</body>",
    "</html>",
    "",
    "------MultipartBoundary----"
  ].join("\r\n");

  return mhtml;
}

export default function ClassMarksheetModal({ student, exams, isOpen, onClose, allStudents, sessionDetails }) {
  const printRef = useRef(null);

  // viewMode: 'overall', 'subject', or examId (e.g. 'Annual')
  const [viewMode, setViewMode] = useState('overall');

  // Compute aggregated subject-wise totals across ALL exams
  const subjectAggregates = useMemo(() => {
     const subMap = {}; // { 'Math': { obtained, max } }

     if (!student || !exams) return [];

     exams.forEach(examId => {
         const examData = student.examDetails?.[examId];
         if (!examData) return;

         const { config, marks } = examData;
         (config?.subjectGroups || []).forEach(group => {
             if (!subMap[group.subjectName]) {
                 subMap[group.subjectName] = { obtained: 0, max: 0, name: group.subjectName };
             }

             (group.tests || []).forEach(test => {
                 subMap[group.subjectName].obtained += parseInt(marks?.[test.id]) || 0;
                 subMap[group.subjectName].max += parseInt(test.maxMarks) || 0;
             });
         });
     });

     return Object.values(subMap);
  }, [student, exams]);

  // Early return if no data
  if (!student || !isOpen) return null;

  // Default values if no session details are set
  const institute = sessionDetails?.instituteName || 'Institute / Coaching Name';
  const director = sessionDetails?.director || '';
  const est = sessionDetails?.est || '';
  const mobile = sessionDetails?.mobile || '';
  const address = sessionDetails?.address || '';
         if (!examData) return;

         const { config, marks } = examData;
         (config.subjectGroups || []).forEach(group => {
             if (!subMap[group.subjectName]) {
                 subMap[group.subjectName] = { obtained: 0, max: 0, name: group.subjectName };
             }

             (group.tests || []).forEach(test => {
                 subMap[group.subjectName].obtained += parseInt(marks?.[test.id]) || 0;
                 subMap[group.subjectName].max += parseInt(test.maxMarks) || 0;
             });
         });
     });

     return Object.values(subMap);
  }, [student, exams]);


  const handleDownloadMHTML = () => {
    if (!printRef.current) return;
    const htmlContent = printRef.current.innerHTML;
    const mhtml = generateMHTML(htmlContent, `${student.name}_Marksheet_${viewMode}`);

    const blob = new Blob([mhtml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}_Marksheet_${viewMode}.mhtml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
      window.print();
  };

  // Renderer for 'overall' (Grand Totals per Exam)
  const renderOverall = () => {
      let cumulativeObtained = 0;
      let cumulativeMax = 0;

      return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Event / Exam Name</TableHead>
                    <TableHead className="text-right">Full Marks</TableHead>
                    <TableHead className="text-right">Obtained</TableHead>
                    <TableHead className="text-right">%</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {exams.map(examId => {
                    const data = student.examTotals[examId];
                    if (!data) return null;

                    cumulativeObtained += data.obtained;
                    cumulativeMax += data.max;
                    const perc = data.max > 0 ? ((data.obtained / data.max) * 100).toFixed(2) : 0;

                    return (
                        <TableRow key={examId}>
                            <TableCell className="font-bold text-indigo-700">{examId}</TableCell>
                            <TableCell className="text-right">{data.max}</TableCell>
                            <TableCell className="text-right font-medium">{data.obtained}</TableCell>
                            <TableCell className="text-right">{perc}%</TableCell>
                        </TableRow>
                    );
                })}
                <TableRow className="bg-blue-50 font-bold border-t-4 border-double">
                    <TableCell>Grand Total (All Events)</TableCell>
                    <TableCell className="text-right">{cumulativeMax}</TableCell>
                    <TableCell className="text-right text-blue-700">{cumulativeObtained}</TableCell>
                    <TableCell className="text-right text-blue-700">
                        {cumulativeMax > 0 ? ((cumulativeObtained/cumulativeMax)*100).toFixed(2) : 0}%
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
      );
  };

  // Renderer for 'subject' (Subject-wise Grand Totals across all Exams)
  const renderSubjectWise = () => {
      return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Total Full Marks</TableHead>
                    <TableHead className="text-right">Total Obtained</TableHead>
                    <TableHead className="text-right">Overall %</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {subjectAggregates.map((sub, idx) => {
                    const perc = sub.max > 0 ? ((sub.obtained / sub.max) * 100).toFixed(2) : 0;
                    return (
                        <TableRow key={idx}>
                            <TableCell className="font-bold">{sub.name}</TableCell>
                            <TableCell className="text-right">{sub.max}</TableCell>
                            <TableCell className="text-right font-medium">{sub.obtained}</TableCell>
                            <TableCell className="text-right">{perc}%</TableCell>
                        </TableRow>
                    )
                })}
                <TableRow className="bg-blue-50 font-bold border-t-4 border-double">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-right">{student.grandMax}</TableCell>
                    <TableCell className="text-right text-blue-700">{student.grandObtained}</TableCell>
                    <TableCell className="text-right text-blue-700">
                        {student.grandMax > 0 ? ((student.grandObtained/student.grandMax)*100).toFixed(2) : 0}%
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
      );
  };

  // Renderer for Individual Exam Details
  const renderIndividualExam = (examId) => {
      const examData = student.examDetails?.[examId];
      if (!examData) return <div className="text-center text-gray-500 py-8">No data found for {examId}</div>;

      const { config, marks } = examData;
      const subjectGroups = config.subjectGroups || [];

      let examObtained = 0;
      let examMax = 0;

      return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead className="text-right">Full Marks</TableHead>
                    <TableHead className="text-right">Obtained</TableHead>
                    <TableHead className="text-right">%</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {subjectGroups.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                        {group.tests.map((test, tIdx) => {
                            const obt = parseInt(marks?.[test.id]) || 0;
                            const max = parseInt(test.maxMarks) || 0;
                            examObtained += obt;
                            examMax += max;
                            const perc = max > 0 ? ((obt / max) * 100).toFixed(2) : 0;

                            return (
                                <TableRow key={test.id} className={tIdx === group.tests.length - 1 ? 'border-b-2' : ''}>
                                    {tIdx === 0 && (
                                        <TableCell rowSpan={group.tests.length} className="font-bold bg-gray-50 border-r align-top">
                                            {group.subjectName}
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium">{test.name || test.id}</TableCell>
                                    <TableCell className="text-right">{max}</TableCell>
                                    <TableCell className="text-right">{obt}</TableCell>
                                    <TableCell className="text-right">{perc}%</TableCell>
                                </TableRow>
                            );
                        })}
                    </React.Fragment>
                ))}
                 <TableRow className="bg-indigo-50 font-bold border-t-4 border-double">
                    <TableCell colSpan={2}>Total ({examId})</TableCell>
                    <TableCell className="text-right">{examMax}</TableCell>
                    <TableCell className="text-right text-indigo-700">{examObtained}</TableCell>
                    <TableCell className="text-right text-indigo-700">
                        {examMax > 0 ? ((examObtained/examMax)*100).toFixed(2) : 0}%
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
      )
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0">
        <DialogHeader className="flex flex-row justify-between items-start border-b pb-4">
          <div>
            <DialogTitle className="text-xl">Composite Marksheet: {student.name}</DialogTitle>
            <DialogDescription>Roll No: {student.rollNo} | Rank: {student.rank}</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-500 hover:text-gray-900">
             <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        {/* View Controls */}
        <div className="flex flex-wrap gap-2 mb-4 print:hidden bg-gray-50 p-3 rounded border">
           <div className="flex items-center text-sm font-semibold text-gray-600 mr-2">
               <LayoutList className="h-4 w-4 mr-1"/> Views:
           </div>
           <Button variant={viewMode === 'overall' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('overall')}>
              All Events (Summary)
           </Button>
           <Button variant={viewMode === 'subject' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('subject')}>
              All Events (Subject-wise)
           </Button>

           <div className="h-6 w-px bg-gray-300 mx-2 self-center"></div>

           {exams.map(examId => (
               <Button key={examId} variant={viewMode === examId ? 'default' : 'outline'} size="sm" onClick={() => setViewMode(examId)}>
                   {examId} Details
               </Button>
           ))}
        </div>

        <div className="mt-2 p-6 bg-white border rounded shadow-sm print:border-none print:shadow-none print:p-0" ref={printRef}>

          {/* Marks Header (Coaching Info) */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
             <h1 className="text-3xl font-black text-blue-900 tracking-tight uppercase mb-1">{institute}</h1>
             {(address || mobile) && (
                 <p className="text-sm text-gray-700 font-medium">
                     {address} {address && mobile && '|'} {mobile && `Mob: ${mobile}`}
                 </p>
             )}
             {(director || est) && (
                 <p className="text-xs text-gray-500 mt-1">
                     {director && `Director: ${director}`} {director && est && '•'} {est && `Est: ${est}`}
                 </p>
             )}
          </div>

          <div className="flex justify-between items-end mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
                  {viewMode === 'overall' ? 'Overall Report Card' :
                   viewMode === 'subject' ? 'Subject-wise Overall Performance' :
                   `Report Card: ${viewMode}`}
              </h2>
              <p className="text-lg text-gray-700 mt-1">Name: <span className="font-bold text-gray-900">{student.name}</span> <span className="text-gray-400 mx-2">|</span> Roll No: <span className="font-bold text-gray-900">{student.rollNo}</span></p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMHTML}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </div>
          </div>

          {/* Render the selected view */}
          <div className="overflow-x-auto">
             {viewMode === 'overall' && renderOverall()}
             {viewMode === 'subject' && renderSubjectWise()}
             {viewMode !== 'overall' && viewMode !== 'subject' && renderIndividualExam(viewMode)}
          </div>

          {/* Rank Section (Only show on overall/subject views) */}
          {(viewMode === 'overall' || viewMode === 'subject') && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div className="p-4 bg-blue-50 rounded text-center border border-blue-100 shadow-sm">
                <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Overall Class Rank</h4>
                <p className="text-3xl font-bold text-blue-900 mt-2">#{student.rank} <span className="text-sm font-normal text-blue-600">/ {allStudents.length}</span></p>
                </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
