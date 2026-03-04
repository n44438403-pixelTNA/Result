import React, { forwardRef } from 'react';
import { cn } from '../lib/utils';

const ResultCard = forwardRef(({ theme, settings, student, config, scale = 1 }, ref) => {
  const s = theme.styles;
  
  // Calculate totals
  const totalMarks = student.marks ? Object.values(student.marks).reduce((sum, m) => sum + (parseInt(m) || 0), 0) : 0;
  const maxMarks = config ? config.maxMarks * (config.subjects?.length || 0) : 0;
  const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;
  
  // Prepare subjects list (from config or student marks keys)
  const subjects = config?.subjects || (student.marks ? Object.keys(student.marks) : []);

  return (
    <div 
      ref={ref}
      className={cn("w-full bg-white text-left overflow-hidden relative print:w-full print:absolute print:top-0 print:left-0", s.container)}
      style={{ 
        fontSize: `${14 * scale}px`, 
        padding: `${40 * scale}px`,
        minHeight: `${600 * scale}px` // Ensure some height
      }}
    >
      <div className={s.header}>
        {settings.logoUrl && (
           <img 
             src={settings.logoUrl} 
             alt="Logo" 
             className="mx-auto mb-4 object-contain"
             style={{ height: `${80 * scale}px` }} 
           />
        )}
        <h1 className={s.instituteName} style={{ fontSize: `${32 * scale}px`, lineHeight: 1.2 }}>{settings.instituteName || 'Institute Name'}</h1>
        <p className={s.tagline} style={{ fontSize: `${16 * scale}px`, marginTop: `${8 * scale}px` }}>{settings.tagline || 'Tagline here'}</p>
        <p style={{ fontSize: `${14 * scale}px`, marginTop: `${4 * scale}px` }}>{settings.address || 'Address Line 1, City'}</p>
      </div>

      <div className="mb-8 flex justify-between items-end border-b pb-4" style={{ fontSize: `${14 * scale}px` }}>
        <div className="space-y-2">
          <p><span className="font-bold">Name:</span> {student.name}</p>
          <p><span className="font-bold">Roll No:</span> {student.rollNo}</p>
        </div>
        <div className="text-right space-y-2">
           <p><span className="font-bold">Class:</span> {student.className || 'N/A'}</p>
           <p><span className="font-bold">Exam:</span> {student.examName || 'N/A'}</p>
        </div>
      </div>

      <table className="w-full mb-8" style={{ fontSize: `${14 * scale}px` }}>
        <thead>
          <tr className={s.tableHeader}>
            <th className="p-3 text-left">Subject</th>
            <th className="p-3 text-center">Max Marks</th>
            <th className="p-3 text-center">Obtained Marks</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((sub, i) => (
            <tr key={i} className={s.tableRow}>
              <td className="p-3 text-left font-medium">{sub}</td>
              <td className="p-3 text-center">{config?.maxMarks || 100}</td>
              <td className="p-3 text-center font-bold">
                {student.marks?.[sub] !== undefined ? student.marks[sub] : '-'}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 font-bold bg-gray-50/50">
            <td className="p-3 text-left text-lg">Total</td>
            <td className="p-3 text-center text-lg">{maxMarks}</td>
            <td className="p-3 text-center text-lg">{totalMarks}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-center mb-8 border p-4 rounded bg-gray-50">
          <div>
              <p className="text-sm text-gray-500">Percentage</p>
              <p className="text-2xl font-bold">{percentage}%</p>
          </div>
          <div>
              <p className="text-sm text-gray-500">Result</p>
              <p className={cn("text-2xl font-bold", percentage >= 33 ? "text-green-600" : "text-red-600")}>
                  {percentage >= 33 ? "PASSED" : "FAILED"}
              </p>
          </div>
      </div>

      <div className={s.footer} style={{ fontSize: `${12 * scale}px` }}>
        <p>Result Generated on {new Date().toLocaleDateString()}</p>
        <p className="mt-2">This is a computer generated document.</p>
      </div>
    </div>
  );
});

ResultCard.displayName = 'ResultCard';

export default ResultCard;
