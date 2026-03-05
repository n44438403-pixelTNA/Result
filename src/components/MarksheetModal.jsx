import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Download, Printer, X } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/Table';

export default function MarksheetModal({ student, config, isOpen, onClose, sessionDetails }) {
  const printRef = useRef(null);

  if (!student || !config || !isOpen) return null;

  // Defaults
  const institute = sessionDetails?.instituteName || 'Institute / Coaching Name';
  const director = sessionDetails?.director || '';
  const est = sessionDetails?.est || '';
  const mobile = sessionDetails?.mobile || '';
  const address = sessionDetails?.address || '';

  const subjectGroups = config.subjectGroups || [];

  let grandTotalObtained = 0;
  let grandTotalMax = 0;

  const handlePrint = () => {
      window.print();
  };

  const getRemarks = (perc) => {
      if (perc >= 90) return "Outstanding Performance! Keep it up.";
      if (perc >= 80) return "Excellent Work! Great job.";
      if (perc >= 70) return "Good Effort. Room for improvement.";
      if (perc >= 60) return "Satisfactory. Needs more focus.";
      if (perc >= 50) return "Below Average. Hard work required.";
      if (perc >= 40) return "Marginal Pass. Immediate attention needed.";
      return "Fail. Please consult with the teacher.";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0">
        <DialogHeader className="flex flex-row justify-between items-start border-b pb-4 print:hidden">
          <div>
            <DialogTitle className="text-xl">Marksheet 2.0</DialogTitle>
            <DialogDescription>Student Name: {student.name}</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 print:hidden">
             <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="mt-2 p-8 bg-white border rounded shadow-sm print:border-2 print:border-gray-800 print:shadow-none print:p-8 relative" ref={printRef}>

          {/* Subtle Watermark for Print */}
          <div className="hidden print:flex absolute inset-0 items-center justify-center pointer-events-none opacity-5">
              <span className="text-8xl font-black uppercase tracking-widest rotate-[-45deg]">{institute}</span>
          </div>

          {/* Header Info */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-800 relative z-10">
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
              <p className="text-lg text-gray-700 mt-1">Name: <span className="font-bold text-gray-900">{student.name || 'N/A'}</span> <span className="text-gray-400 mx-2">|</span> Roll No: <span className="font-bold text-gray-900">{student.rollNo}</span></p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
            </div>
          </div>

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
                <React.Fragment key={`group-${gIdx}`}>
                  {group.tests.map((test, tIdx) => {
                    const marks = parseInt(student.marks?.[test.id]) || 0;
                    const max = parseInt(test.maxMarks) || 0;
                    const perc = max > 0 ? ((marks / max) * 100).toFixed(2) : 0;

                    grandTotalObtained += marks;
                    grandTotalMax += max;

                    return (
                      <TableRow key={`test-${test.id}`} className={tIdx === group.tests.length - 1 ? 'border-b-2' : ''}>
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
              <TableRow className="bg-blue-50 font-bold border-t-4 border-double print:bg-gray-100">
                <TableCell colSpan={3} className="text-lg">Grand Total</TableCell>
                <TableCell className="text-right text-lg">{grandTotalMax}</TableCell>
                <TableCell className="text-right text-blue-800 text-lg">{grandTotalObtained}</TableCell>
                <TableCell className="text-right text-blue-800 text-lg">{grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(2) : 0}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Remarks Section */}
          <div className="mt-8 p-4 bg-gray-50 border rounded-md relative z-10 print:bg-white print:border-gray-400">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-1">Teacher's Remarks</h3>
              <p className="text-lg font-medium text-gray-800 italic">
                  {grandTotalMax > 0 ? getRemarks((grandTotalObtained / grandTotalMax) * 100) : "N/A"}
              </p>
          </div>

          {/* Signatures */}
          <div className="mt-20 flex justify-between px-4 relative z-10">
              <div className="text-center">
                  <div className="w-32 border-t-2 border-gray-800 mb-2"></div>
                  <span className="text-sm font-bold text-gray-600">Parent's Signature</span>
              </div>
              <div className="text-center">
                  <div className="w-32 border-t-2 border-gray-800 mb-2"></div>
                  <span className="text-sm font-bold text-gray-600">Class Teacher</span>
              </div>
              <div className="text-center">
                  <div className="w-32 border-t-2 border-gray-800 mb-2"></div>
                  <span className="text-sm font-bold text-gray-600">Principal</span>
              </div>
          </div>

          <div className="mt-12 text-center text-xs text-gray-400 font-medium relative z-10">
              Developed by Nadim Anwar
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
