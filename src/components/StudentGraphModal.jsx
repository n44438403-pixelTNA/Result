import React, { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Printer, X } from 'lucide-react';

export default function StudentGraphModal({
  student,
  viewType = 'exam', // 'exam' or 'overall'
  examConfig,
  examMarks,
  overallData, // [{ label: 'Exam1', percentage: 80 }]
  isOpen,
  onClose,
  title
}) {
  const printRef = useRef(null);

  // mode: 'all', 'subject', 'test'
  const [mode, setMode] = useState('all');

  // Derive graphData based on viewType and mode
  const graphData = useMemo(() => {
    if (viewType === 'overall') {
      return overallData || [];
    }

    if (!examConfig?.subjectGroups) return [];

    if (mode === 'all') {
      // All Tests across all subjects
      const testAggregates = new Map();
      examConfig.subjectGroups.forEach(group => {
        group.tests.forEach(test => {
          const key = test.date || test.name;
          const marks = parseInt(examMarks?.[test.id]) || 0;
          const max = parseInt(test.maxMarks) || 0;
          if (!testAggregates.has(key)) {
            testAggregates.set(key, { obtained: 0, max: 0, label: key });
          }
          const agg = testAggregates.get(key);
          agg.obtained += marks;
          agg.max += max;
        });
      });
      const sortedKeys = Array.from(testAggregates.keys()).sort();
      return sortedKeys.map(key => {
        const agg = testAggregates.get(key);
        const perc = agg.max > 0 ? ((agg.obtained / agg.max) * 100).toFixed(2) : 0;
        return { label: agg.label, percentage: perc };
      });
    }

    if (mode === 'subject') {
      // Subject-wise totals
      const subData = [];
      examConfig.subjectGroups.forEach(group => {
        let obtained = 0;
        let max = 0;
        group.tests.forEach(test => {
          obtained += parseInt(examMarks?.[test.id]) || 0;
          max += parseInt(test.maxMarks) || 0;
        });
        const perc = max > 0 ? ((obtained / max) * 100).toFixed(2) : 0;
        subData.push({ label: group.subjectName, percentage: perc });
      });
      return subData;
    }

    if (mode === 'test') {
      // Test-wise (Individual tests, distinguished if needed)
      const testData = [];
      examConfig.subjectGroups.forEach(group => {
        group.tests.forEach(test => {
          const marks = parseInt(examMarks?.[test.id]) || 0;
          const max = parseInt(test.maxMarks) || 0;
          const perc = max > 0 ? ((marks / max) * 100).toFixed(2) : 0;
          testData.push({ label: `${group.subjectName}: ${test.name}`, percentage: perc });
        });
      });
      return testData;
    }

    return [];
  }, [viewType, examConfig, examMarks, overallData, mode]);

  if (!student || !isOpen) return null;

  // Render timeline SVG graph (Trend line)
  const renderTrendLine = () => {
    if (!graphData || graphData.length === 0) return null;

    const minPointSpacing = 80;
    const paddingX = 40;
    const paddingY = 40;
    const height = 300;

    // Calculate total needed width
    const pointsCount = graphData.length;
    const neededWidth = (pointsCount > 1 ? (pointsCount - 1) * minPointSpacing : minPointSpacing) + (paddingX * 2);
    // Use at least 800px or the needed width
    const width = Math.max(800, neededWidth);

    const usableWidth = width - (paddingX * 2);
    const usableHeight = height - (paddingY * 2);

    const stepX = graphData.length > 1 ? usableWidth / (graphData.length - 1) : usableWidth / 2;

    // Create points
    const points = graphData.map((data, index) => {
        const x = paddingX + (index * stepX);
        const y = paddingY + usableHeight - ((data.percentage / 100) * usableHeight);
        return { x, y, perc: data.percentage, label: data.label };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <div className="w-full overflow-x-auto mt-6 border p-4 rounded bg-gray-50">
            <svg viewBox={`0 0 ${width} ${height + 60}`} style={{ width: `${width}px`, height: `${height+60}px` }} className="font-sans">
               {/* Grid lines */}
               {[0, 25, 50, 75, 100].map(val => (
                  <g key={`grid-${val}`}>
                     <text x="5" y={paddingY + usableHeight - ((val/100)*usableHeight) + 4} fontSize="12" fill="#888">{val}%</text>
                     <line
                        x1={paddingX - 10}
                        y1={paddingY + usableHeight - ((val/100)*usableHeight)}
                        x2={width - 10}
                        y2={paddingY + usableHeight - ((val/100)*usableHeight)}
                        stroke="#ddd"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                     />
                  </g>
               ))}

               {/* The Trend Line */}
               <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="3" />

               {/* Data Points & Labels */}
               {points.map((p, i) => (
                  <g key={`point-${i}`}>
                     <circle cx={p.x} cy={p.y} r="6" fill="#1e40af" />
                     <text x={p.x} y={p.y - 15} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e40af">
                        {p.perc}%
                     </text>
                     <text x={p.x} y={height + 20} textAnchor="end" fontSize="12" fill="#4b5563" transform={`rotate(-45, ${p.x}, ${height+20})`}>
                        {p.label}
                     </text>
                  </g>
               ))}
            </svg>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="flex flex-row justify-between items-start border-b pb-4">
          <div>
            <DialogTitle className="text-xl">Performance Trend: {student.name}</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
             <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex gap-2 mb-4 justify-between items-center print:hidden">
            {viewType === 'exam' ? (
              <div className="flex gap-2">
                <Button variant={mode === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setMode('all')}>All</Button>
                <Button variant={mode === 'subject' ? 'default' : 'outline'} size="sm" onClick={() => setMode('subject')}>Subject Wise</Button>
                <Button variant={mode === 'test' ? 'default' : 'outline'} size="sm" onClick={() => setMode('test')}>Test Wise</Button>
              </div>
            ) : <div/>}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
               <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
        </div>

        <div className="p-6 bg-white border rounded print:border-none print:shadow-none" ref={printRef}>
            <div className="text-center mb-8">
               <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
               <p className="text-gray-600">Student: <span className="font-semibold text-gray-900">{student.name}</span> | Roll No: {student.rollNo}</p>
            </div>

            <div className="mb-4 text-gray-600 text-sm italic text-center">
                This timeline graph shows the performance ups and downs of the student's percentage.
            </div>

            {graphData && graphData.length > 0 ? (
                <>
                    {renderTrendLine()}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border p-4 rounded bg-green-50 border-green-200">
                            <h4 className="font-bold text-green-800 border-b border-green-200 pb-2 mb-2">Strong Areas ( &gt;= 75% )</h4>
                            <ul className="list-disc pl-5 text-sm text-green-900 space-y-1">
                                {graphData.filter(d => parseFloat(d.percentage) >= 75).length > 0
                                  ? graphData.filter(d => parseFloat(d.percentage) >= 75).map((d, i) => <li key={i}>{d.label} - {d.percentage}%</li>)
                                  : <li className="text-gray-500 italic list-none">None yet</li>}
                            </ul>
                        </div>
                        <div className="border p-4 rounded bg-red-50 border-red-200">
                            <h4 className="font-bold text-red-800 border-b border-red-200 pb-2 mb-2">Weak Areas ( &lt; 40% )</h4>
                            <ul className="list-disc pl-5 text-sm text-red-900 space-y-1">
                                {graphData.filter(d => parseFloat(d.percentage) < 40).length > 0
                                  ? graphData.filter(d => parseFloat(d.percentage) < 40).map((d, i) => <li key={i}>{d.label} - {d.percentage}%</li>)
                                  : <li className="text-gray-500 italic list-none">None yet</li>}
                            </ul>
                        </div>
                    </div>
                </>
            ) : (
                <p className="text-center text-gray-500 py-12">No data available for graph.</p>
            )}

            <div className="mt-12 text-center text-xs text-gray-400 font-medium">
                Developed by Nadim Anwar
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
