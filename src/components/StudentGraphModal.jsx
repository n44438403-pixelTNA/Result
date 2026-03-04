import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Download, Printer, X } from 'lucide-react';

export default function StudentGraphModal({ student, graphData, isOpen, onClose, title }) {
  const printRef = useRef(null);

  if (!student || !isOpen) return null;

  const handleDownloadMHTML = () => {
    if (!printRef.current) return;
    const htmlContent = printRef.current.innerHTML;
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
      `<title>${title} - ${student.name}</title>`,
      "<style>",
      "body { font-family: sans-serif; padding: 20px; }",
      ".graph-container { display: flex; align-items: flex-end; justify-content: space-around; height: 300px; padding-top: 40px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }",
      ".bar-wrapper { display: flex; flex-direction: column; align-items: center; width: 60px; position: relative; }",
      ".bar { width: 100%; background-color: #3b82f6; border-radius: 4px 4px 0 0; min-height: 4px; }",
      ".label { margin-top: 10px; font-size: 12px; color: #4b5563; transform: rotate(45deg); transform-origin: left; white-space: nowrap; }",
      ".value { position: absolute; top: -24px; font-size: 12px; font-weight: bold; color: #1e40af; }",
      ".header { text-align: center; margin-bottom: 40px; }",
      "</style>",
      "</head>",
      "<body>",
      htmlContent,
      "</body>",
      "</html>",
      "",
      "------MultipartBoundary----"
    ].join("\r\n");

    const blob = new Blob([mhtml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}_Graph.mhtml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="flex flex-row justify-between items-start border-b pb-4">
          <div>
            <DialogTitle className="text-xl">Performance Graph: {student.name}</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
             <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex gap-2 mb-4 justify-end print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
               <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadMHTML}>
               <Download className="h-4 w-4 mr-2" /> Download MHTML
            </Button>
        </div>

        <div className="p-6 bg-white border rounded" ref={printRef}>
            <div className="header">
               <h2 className="text-2xl font-bold">{title}</h2>
               <p className="text-gray-600">Student: {student.name} | Roll No: {student.rollNo}</p>
            </div>

            {graphData && graphData.length > 0 ? (
                <div className="graph-container">
                    {graphData.map((data, idx) => (
                        <div key={idx} className="bar-wrapper">
                            <div className="value">{data.percentage}%</div>
                            <div className="bar" style={{ height: `${Math.max(data.percentage, 1)}%` }}></div>
                            <div className="label">{data.label}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-12">No data available for graph.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
