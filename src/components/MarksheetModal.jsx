import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Download, Printer } from 'lucide-react';
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

export default function MarksheetModal({ student, config, isOpen, onClose, allStudents }) {
  const printRef = useRef(null);

  if (!student || !config || !isOpen) return null;

  const tests = config.tests || [];

  // Calculate Totals for this student
  let studentTotalObtained = 0;
  let studentTotalMax = 0;

  tests.forEach(test => {
    const marks = student.marks?.[test.id] || 0;
    studentTotalObtained += parseInt(marks);
    studentTotalMax += parseInt(test.maxMarks || 0);
  });

  const studentPercentage = studentTotalMax > 0 ? ((studentTotalObtained / studentTotalMax) * 100).toFixed(2) : 0;

  // Calculate ranks
  const studentsWithTotals = allStudents.map(s => {
    let total = 0;
    tests.forEach(t => {
      total += parseInt(s.marks?.[t.id] || 0);
    });
    return { ...s, totalObtained: total };
  });

  // Sort descending by total
  studentsWithTotals.sort((a, b) => b.totalObtained - a.totalObtained);

  const studentIndex = studentsWithTotals.findIndex(s => s.rollNo === student.rollNo);
  const rank = studentIndex + 1;

  // Find neighbors
  const ahead = studentIndex > 0 ? studentsWithTotals[studentIndex - 1] : null;
  const behind = studentIndex < studentsWithTotals.length - 1 ? studentsWithTotals[studentIndex + 1] : null;

  const handleDownloadMHTML = () => {
    if (!printRef.current) return;
    const htmlContent = printRef.current.innerHTML;
    const mhtml = generateMHTML(htmlContent, `${student.name}_Marksheet`);

    const blob = new Blob([mhtml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}_Marksheet.mhtml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Quick reset
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row justify-between items-start">
          <div>
            <DialogTitle>Marksheet: {student.name}</DialogTitle>
            <DialogDescription>Roll No: {student.rollNo}</DialogDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button variant="default" size="sm" onClick={handleDownloadMHTML}>
              <Download className="h-4 w-4 mr-2" /> MHTML
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4 p-6 bg-white border rounded shadow-sm" ref={printRef}>
          <div className="text-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold">Student Marksheet</h2>
            <p className="text-gray-600 mt-1">Name: {student.name} | Roll No: {student.rollNo}</p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test / Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Full Marks</TableHead>
                <TableHead className="text-right">Obtained</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map(test => {
                const marks = student.marks?.[test.id] || 0;
                const max = parseInt(test.maxMarks || 0);
                const perc = max > 0 ? ((marks / max) * 100).toFixed(2) : 0;
                return (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.name}</TableCell>
                    <TableCell>{test.date || '-'}</TableCell>
                    <TableCell className="text-right">{max}</TableCell>
                    <TableCell className="text-right">{marks}</TableCell>
                    <TableCell className="text-right">{perc}%</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-gray-50 font-bold border-t-2">
                <TableCell colSpan={2}>Grand Total</TableCell>
                <TableCell className="text-right">{studentTotalMax}</TableCell>
                <TableCell className="text-right text-blue-600">{studentTotalObtained}</TableCell>
                <TableCell className="text-right text-blue-600">{studentPercentage}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded text-center border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Class Rank</h4>
              <p className="text-3xl font-bold text-blue-900 mt-2">#{rank} <span className="text-sm font-normal text-blue-600">/ {allStudents.length}</span></p>
            </div>

            <div className="p-4 bg-green-50 rounded border border-green-100 flex flex-col justify-center">
              <h4 className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Ahead of you</h4>
              {ahead ? (
                <p className="text-sm"><span className="font-bold">{ahead.name}</span> (Rank {rank-1})<br/>Total: {ahead.totalObtained}</p>
              ) : (
                <p className="text-sm text-green-600 font-medium italic">You are Rank 1!</p>
              )}
            </div>

            <div className="p-4 bg-orange-50 rounded border border-orange-100 flex flex-col justify-center">
              <h4 className="text-xs font-semibold text-orange-800 uppercase tracking-wider mb-1">Behind you</h4>
              {behind ? (
                <p className="text-sm"><span className="font-bold">{behind.name}</span> (Rank {rank+1})<br/>Total: {behind.totalObtained}</p>
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
