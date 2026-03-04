import React, { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Download, Printer, X } from 'lucide-react';
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

export default function MarksheetModal({ student, config, isOpen, onClose, allStudents, sessionDetails }) {
  const printRef = useRef(null);
  const [viewMode, setViewMode] = useState('test'); // 'test' or 'subject'

  // Early return if no data
  if (!student || !config || !isOpen) return null;

  // Default values if no session details are set
  const institute = sessionDetails?.instituteName || 'Institute / Coaching Name';
  const director = sessionDetails?.director || '';
  const est = sessionDetails?.est || '';
  const mobile = sessionDetails?.mobile || '';
  const address = sessionDetails?.address || '';

  const subjectGroups = config.subjectGroups || [];

  // Aggregation for stats and graphs
  const aggregatedStats = useMemo(() => {
    let grandTotalObtained = 0;
    let grandTotalMax = 0;
    const subjectsAgg = [];
    const monthlyStats = {}; // { 'YYYY-MM': { obtained: 0, max: 0 } }

    subjectGroups.forEach(group => {
      let subObtained = 0;
      let subMax = 0;

      group.tests.forEach(test => {
        const marks = parseInt(student.marks?.[test.id]) || 0;
        const max = parseInt(test.maxMarks) || 0;

        subObtained += marks;
        subMax += max;

        grandTotalObtained += marks;
        grandTotalMax += max;

        if (test.date) {
          const monthKey = test.date.substring(0, 7); // YYYY-MM
          if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { obtained: 0, max: 0 };
          monthlyStats[monthKey].obtained += marks;
          monthlyStats[monthKey].max += max;
        }
      });

      subjectsAgg.push({
        subjectName: group.subjectName,
        obtained: subObtained,
        max: subMax,
        percentage: subMax > 0 ? ((subObtained / subMax) * 100).toFixed(2) : 0
      });
    });

    // Prepare graph data
    const sortedMonths = Object.keys(monthlyStats).sort();
    const graphData = sortedMonths.map(month => {
      const stat = monthlyStats[month];
      return {
        month,
        percentage: stat.max > 0 ? ((stat.obtained / stat.max) * 100).toFixed(2) : 0
      };
    });

    return {
      grandTotalObtained,
      grandTotalMax,
      grandPercentage: grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(2) : 0,
      subjectsAgg,
      graphData
    };
  }, [student, subjectGroups]);

  // Calculate ranks across all students
  const rankStats = useMemo(() => {
    const studentsWithTotals = allStudents.map(s => {
      let total = 0;
      subjectGroups.forEach(g => {
        g.tests.forEach(t => {
          total += parseInt(s.marks?.[t.id] || 0);
        });
      });
      return { ...s, totalObtained: total };
    });

    studentsWithTotals.sort((a, b) => b.totalObtained - a.totalObtained);

    const studentIndex = studentsWithTotals.findIndex(s => s.rollNo === student.rollNo);
    const rank = studentIndex + 1;
    const ahead = studentIndex > 0 ? studentsWithTotals[studentIndex - 1] : null;
    const behind = studentIndex < studentsWithTotals.length - 1 ? studentsWithTotals[studentIndex + 1] : null;

    return { rank, ahead, behind, totalStudents: studentsWithTotals.length };
  }, [student, allStudents, subjectGroups]);


  const handleDownloadMHTML = () => {
    if (!printRef.current) return;
    const htmlContent = printRef.current.innerHTML;
    const mhtml = generateMHTML(htmlContent, `${student.name}_Marksheet_${viewMode}`);

    const blob = new Blob([mhtml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}_Marksheet.mhtml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0">
        <DialogHeader className="flex flex-row justify-between items-start border-b pb-4">
          <div>
            <DialogTitle className="text-xl">Marksheet: {student.name}</DialogTitle>
            <DialogDescription>Roll No: {student.rollNo}</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-500 hover:text-gray-900">
             <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex gap-4 mb-4 print:hidden">
           <Button variant={viewMode === 'test' ? 'default' : 'outline'} onClick={() => setViewMode('test')}>
              Test-Wise View
           </Button>
           <Button variant={viewMode === 'subject' ? 'default' : 'outline'} onClick={() => setViewMode('subject')}>
              Subject-Wise View
           </Button>
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

          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Report Card</h2>
              <p className="text-lg text-gray-700 mt-1">Name: <span className="font-bold text-gray-900">{student.name}</span> <span className="text-gray-400 mx-2">|</span> Roll No: <span className="font-bold text-gray-900">{student.rollNo}</span></p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMHTML}>
                <Download className="h-4 w-4 mr-2" /> MHTML
              </Button>
            </div>
          </div>

          {viewMode === 'test' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Full Marks</TableHead>
                  <TableHead className="text-right">Obtained</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectGroups.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {group.tests.map((test, tIdx) => {
                      const marks = parseInt(student.marks?.[test.id]) || 0;
                      const max = parseInt(test.maxMarks) || 0;
                      const perc = max > 0 ? ((marks / max) * 100).toFixed(2) : 0;
                      return (
                        <TableRow key={test.id} className={tIdx === group.tests.length - 1 ? 'border-b-2' : ''}>
                          {tIdx === 0 && (
                            <TableCell rowSpan={group.tests.length} className="font-bold bg-gray-50 border-r align-top">
                              {group.subjectName}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{test.name}</TableCell>
                          <TableCell className="text-sm text-gray-500">{test.date || '-'}</TableCell>
                          <TableCell className="text-right">{max}</TableCell>
                          <TableCell className="text-right">{marks}</TableCell>
                          <TableCell className="text-right">{perc}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
                <TableRow className="bg-blue-50 font-bold border-t-4 border-double">
                  <TableCell colSpan={3}>Grand Total</TableCell>
                  <TableCell className="text-right">{aggregatedStats.grandTotalMax}</TableCell>
                  <TableCell className="text-right text-blue-700">{aggregatedStats.grandTotalObtained}</TableCell>
                  <TableCell className="text-right text-blue-700">{aggregatedStats.grandPercentage}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
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
                {aggregatedStats.subjectsAgg.map((sub, idx) => (
                   <TableRow key={idx}>
                      <TableCell className="font-bold">{sub.subjectName}</TableCell>
                      <TableCell className="text-right">{sub.max}</TableCell>
                      <TableCell className="text-right font-medium">{sub.obtained}</TableCell>
                      <TableCell className="text-right">{sub.percentage}%</TableCell>
                   </TableRow>
                ))}
                <TableRow className="bg-blue-50 font-bold border-t-4 border-double">
                  <TableCell>Grand Total</TableCell>
                  <TableCell className="text-right">{aggregatedStats.grandTotalMax}</TableCell>
                  <TableCell className="text-right text-blue-700">{aggregatedStats.grandTotalObtained}</TableCell>
                  <TableCell className="text-right text-blue-700">{aggregatedStats.grandPercentage}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {/* Performance Graph (Monthly) */}
          {aggregatedStats.graphData.length > 0 && (
             <div className="mt-8 border p-4 rounded bg-gray-50">
                <h3 className="font-bold text-lg mb-4 text-center">Performance Growth (Monthly %)</h3>
                <div className="flex items-end justify-around h-48 pt-6 pb-2 border-b border-gray-300">
                   {aggregatedStats.graphData.map((data, idx) => (
                      <div key={idx} className="flex flex-col items-center w-full max-w-[60px] group relative">
                         <div className="absolute -top-6 text-xs font-bold text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            {data.percentage}%
                         </div>
                         <div
                           className="w-full bg-blue-500 rounded-t shadow-sm hover:bg-blue-600 transition-all"
                           style={{ height: `${data.percentage}%`, minHeight: '4px' }}
                         ></div>
                         <div className="mt-2 text-xs text-gray-600 font-medium rotate-45 origin-left whitespace-nowrap">
                            {data.month}
                         </div>
                      </div>
                   ))}
                </div>
                <div className="mt-8 text-center text-xs text-gray-500 italic">Hover over bars to see exact percentage.</div>
             </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded text-center border border-blue-100 shadow-sm">
              <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Class Rank</h4>
              <p className="text-3xl font-bold text-blue-900 mt-2">#{rankStats.rank} <span className="text-sm font-normal text-blue-600">/ {rankStats.totalStudents}</span></p>
            </div>

            <div className="p-4 bg-green-50 rounded border border-green-100 flex flex-col justify-center shadow-sm">
              <h4 className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Ahead of you</h4>
              {rankStats.ahead ? (
                <p className="text-sm"><span className="font-bold">{rankStats.ahead.name}</span> (Rank {rankStats.rank-1})<br/>Total: {rankStats.ahead.totalObtained}</p>
              ) : (
                <p className="text-sm text-green-600 font-medium italic">You are Rank 1!</p>
              )}
            </div>

            <div className="p-4 bg-orange-50 rounded border border-orange-100 flex flex-col justify-center shadow-sm">
              <h4 className="text-xs font-semibold text-orange-800 uppercase tracking-wider mb-1">Behind you</h4>
              {rankStats.behind ? (
                <p className="text-sm"><span className="font-bold">{rankStats.behind.name}</span> (Rank {rankStats.rank+1})<br/>Total: {rankStats.behind.totalObtained}</p>
              ) : (
                <p className="text-sm text-orange-600 font-medium italic">No one behind you.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
