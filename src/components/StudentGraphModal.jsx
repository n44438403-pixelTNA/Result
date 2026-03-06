import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Download, Printer, X } from 'lucide-react';

import { LayoutList } from 'lucide-react';
import { generateHTML, downloadHTML } from '../lib/html';

export default function StudentGraphModal({ student, datasets, isOpen, onClose, title, sessionDetails }) {
  const printRef = useRef(null);
  const [activeView, setActiveView] = React.useState(null);

  const institute = sessionDetails?.instituteName || 'Institute / Coaching Name';
  const director = sessionDetails?.director || '';
  const est = sessionDetails?.est || '';
  const mobile = sessionDetails?.mobile || '';
  const address = sessionDetails?.address || '';

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
    const height = 400; // Increased height to accommodate rotated 45deg labels without clipping
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

    // Area fill path (closes down to the bottom)
    const areaPathData = `${pathData} L ${points[points.length - 1].x} ${paddingY + usableHeight} L ${points[0].x} ${paddingY + usableHeight} Z`;

    return (
        <div className="w-full overflow-x-auto mt-6 border p-4 rounded bg-white shadow-inner custom-scrollbar relative">
            <svg viewBox={`0 0 ${baseWidth} ${height + 60}`} style={{ width: baseWidth, height: height + 60 }} className="font-sans">
               <defs>
                   <linearGradient id="gradientFill" x1="0" x2="0" y1="0" y2="1">
                       <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                       <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                   </linearGradient>
               </defs>

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

               {/* The Trend Line Area Fill */}
               <path d={areaPathData} fill="url(#gradientFill)" />

               {/* The Trend Line */}
               <path d={pathData} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

               {/* Data Points & Labels */}
               {points.map((p, i) => (
                  <g key={`point-${i}`}>
                     <circle cx={p.x} cy={p.y} r="6" fill="#ffffff" stroke="#1e40af" strokeWidth="3" />
                     <rect x={p.x - 22} y={p.y - 35} width="44" height="24" rx="4" fill="#1e3a8a" opacity="0.9" />
                     <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ffffff">
                        {p.perc}%
                     </text>
                     <text x={p.x} y={height + 25} textAnchor="start" fontSize="12" fill="#4b5563" transform={`rotate(45, ${p.x}, ${height+25})`}>
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
      <DialogContent className="max-w-max max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0 bg-gray-100 print:bg-white">

        <style>
          {`
            @media print {
              @page { size: A4 landscape; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}
        </style>

        <DialogHeader className="flex flex-row justify-between items-start border-b pb-4 print:hidden">
          <div>
            <DialogTitle className="text-xl">Performance Trend: {student.name}</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 print:hidden text-gray-500 hover:text-gray-900">
             <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex gap-2 mb-4 justify-end print:hidden max-w-[297mm] mx-auto pt-4">
            <Button variant="outline" size="sm" onClick={() => {
                if (!printRef.current) return;
                const htmlContent = printRef.current.innerHTML;
                const html = generateHTML(htmlContent, `${student.name}_Graph`);
                downloadHTML(html, `${student.name}_Graph.html`);
            }} className="bg-white">
               <Download className="h-4 w-4 mr-2" /> Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-white">
               <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
        </div>

        <div className="mx-auto p-10 bg-white shadow-xl relative print:shadow-none print:border-[3px] print:border-gray-900 print:m-0 print:p-8 overflow-hidden flex flex-col"
             style={{ width: '297mm', minHeight: '210mm', boxSizing: 'border-box' }}
             ref={printRef}>

            {/* Subtle Watermark for Print */}
            <div className="hidden print:flex absolute inset-0 items-center justify-center pointer-events-none opacity-10">
                <div className="text-6xl font-black uppercase tracking-[0.3em] text-gray-400 rotate-[-25deg] text-center leading-relaxed max-w-[250mm] break-words">
                    {institute}
                </div>
            </div>

            {/* Professional Header Info */}
            <div className="text-center mb-6 pb-4 border-b-[3px] border-double border-gray-800 relative z-10">
               <h1 className="text-3xl font-black text-[#1e3a8a] tracking-tight uppercase mb-1 font-serif drop-shadow-sm">{institute}</h1>
               {(address || mobile) && (
                   <p className="text-xs text-gray-700 font-semibold tracking-wide">
                       {address} {address && mobile && ' | '} {mobile && `Mob: ${mobile}`}
                   </p>
               )}
               <div className="mt-4 pt-2 border-t border-gray-200">
                   <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                   <p className="text-sm text-gray-600 mt-1">Student: <span className="font-bold text-gray-900">{student.name}</span> <span className="mx-2 text-gray-300">|</span> Roll No: <span className="font-bold text-gray-900">{student.rollNo}</span></p>
               </div>
            </div>

            <div className="mb-4 text-gray-600 text-sm italic text-center print:hidden">
                This timeline graph shows the performance trend (kam jayada) of the student across assessments.
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
                    {(() => {
                        const highest = [...currentData].sort((a,b) => b.percentage - a.percentage)[0];
                        const lowest = [...currentData].sort((a,b) => a.percentage - b.percentage)[0];
                        return (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-2 mt-4 text-center shadow-sm">
                                <h3 className="text-blue-800 font-bold mb-1">Performance Summary</h3>
                                <p className="text-sm text-blue-900">
                                    The student's performance peaked in <strong>{highest.label}</strong> with a score of <strong>{highest.percentage}%</strong>,
                                    while the lowest recorded score was in <strong>{lowest.label}</strong> at <strong>{lowest.percentage}%</strong>.
                                </p>
                            </div>
                        );
                    })()}

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

            <div className="mt-auto pt-8 text-center text-xs text-gray-400 font-medium relative z-10">
                Developed by Nadim Anwar
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
