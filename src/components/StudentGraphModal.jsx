import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Download, Printer, X } from 'lucide-react';

import { LayoutList } from 'lucide-react';

export default function StudentGraphModal({ student, datasets, isOpen, onClose, title }) {
  const printRef = useRef(null);
  const [activeView, setActiveView] = React.useState(null);

  React.useEffect(() => {
     if (datasets && Object.keys(datasets).length > 0 && !activeView) {
         // Set default to the first available key
         setActiveView(Object.keys(datasets)[0]);
     }
  }, [datasets, activeView]);

  if (!student || !isOpen || !datasets) return null;

  const currentData = activeView ? datasets[activeView] : [];

  // Render timeline SVG graph (Trend line)
  const renderTrendLine = () => {
    if (!currentData || currentData.length === 0) return null;

    // Dynamic SVG dimensions based on data length (makes it scrollable if many points)
    const baseWidth = Math.max(800, currentData.length * 100);
    const height = 350;
    const paddingX = 60;
    const paddingY = 40;

    const usableWidth = baseWidth - (paddingX * 2);
    const usableHeight = height - (paddingY * 2);

    const stepX = currentData.length > 1 ? usableWidth / (currentData.length - 1) : usableWidth / 2;

    // Create points
    const points = currentData.map((data, index) => {
        const x = paddingX + (index * stepX);
        const y = paddingY + usableHeight - ((data.percentage / 100) * usableHeight);
        return { x, y, perc: data.percentage, label: data.label };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <div className="w-full overflow-x-auto mt-6 border p-4 rounded bg-gray-50 custom-scrollbar">
            <svg viewBox={`0 0 ${baseWidth} ${height + 60}`} style={{ width: baseWidth, height: height + 60 }} className="font-sans">
               {/* Grid lines */}
               {[0, 25, 50, 75, 100].map(val => (
                  <g key={`grid-${val}`}>
                     <text x="10" y={paddingY + usableHeight - ((val/100)*usableHeight) + 4} fontSize="12" fill="#888" fontWeight="bold">{val}%</text>
                     <line
                        x1={paddingX - 10}
                        y1={paddingY + usableHeight - ((val/100)*usableHeight)}
                        x2={baseWidth - 10}
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
                     <text x={p.x} y={height + 20} textAnchor="middle" fontSize="12" fill="#4b5563" transform={`rotate(15, ${p.x}, ${height+20})`}>
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

        <div className="flex gap-2 mb-4 justify-end print:hidden">
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
                This timeline graph shows the "kam jayada" (ups and downs) of the student's percentage across all tests by date.
            </div>

            {Object.keys(datasets).length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6 print:hidden bg-gray-50 p-3 rounded border justify-center">
                    <div className="flex items-center text-sm font-semibold text-gray-600 mr-2">
                        <LayoutList className="h-4 w-4 mr-1"/> View Mode:
                    </div>
                    {Object.keys(datasets).map(key => (
                        <Button
                            key={key}
                            variant={activeView === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveView(key)}
                            className="capitalize"
                        >
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Button>
                    ))}
                </div>
            )}

            {currentData && currentData.length > 0 ? (
                <>
                    {renderTrendLine()}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border p-4 rounded bg-green-50 border-green-200">
                            <h4 className="font-bold text-green-800 border-b border-green-200 pb-2 mb-2">Strong Areas ( &gt;= 75% )</h4>
                            <ul className="list-disc pl-5 text-sm text-green-900 space-y-1">
                                {currentData.filter(d => parseFloat(d.percentage) >= 75).length > 0
                                  ? currentData.filter(d => parseFloat(d.percentage) >= 75).map((d, i) => <li key={i}>{d.label} - {d.percentage}%</li>)
                                  : <li className="text-gray-500 italic list-none">None yet</li>}
                            </ul>
                        </div>
                        <div className="border p-4 rounded bg-red-50 border-red-200">
                            <h4 className="font-bold text-red-800 border-b border-red-200 pb-2 mb-2">Weak Areas ( &lt; 40% )</h4>
                            <ul className="list-disc pl-5 text-sm text-red-900 space-y-1">
                                {currentData.filter(d => parseFloat(d.percentage) < 40).length > 0
                                  ? currentData.filter(d => parseFloat(d.percentage) < 40).map((d, i) => <li key={i}>{d.label} - {d.percentage}%</li>)
                                  : <li className="text-gray-500 italic list-none">None yet</li>}
                            </ul>
                        </div>
                    </div>
                </>
            ) : (
                <p className="text-center text-gray-500 py-12">No data available for this view.</p>
            )}

            <div className="mt-12 text-center text-xs text-gray-400 font-medium">
                Developed by Nadim Anwar
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
