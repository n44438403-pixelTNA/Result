import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { themes } from '../../lib/themes';
import ResultCard from '../../components/ResultCard';
import { Button } from '../../components/ui/Button';
import { Download, ArrowLeft, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function ResultPage() {
  const { session, classId, examId, rollNo } = useParams();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [config, setConfig] = useState(null);
  const [settings, setSettings] = useState(null);
  const [theme, setTheme] = useState(themes[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadData();
  }, [session, classId, examId, rollNo]);

  const loadData = async () => {
    console.log("Loading Data for:", session, classId, examId, rollNo);
    setLoading(true);
    try {
      console.log("Fetching DB data...");
      const [stu, cfg, sett] = await Promise.all([
        db.getStudentResult(session, classId, examId, rollNo),
        db.getExamConfig(session, classId, examId),
        db.getInstituteSettings()
      ]);
      console.log("DB Data fetched:", stu, cfg, sett);

      if (!stu) {
        setError('Student result not found.');
      } else {
        setStudent({ ...stu, className: classId, examName: examId }); // Add context
        setConfig(cfg);
        setSettings(sett);
        
        if (sett && sett.themeId) {
          const foundTheme = themes.find(t => t.id === sett.themeId);
          if (foundTheme) setTheme(foundTheme);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load result.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // For images
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 20; // Top margin

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (imgHeight * pdfWidth) / imgWidth); // Fit to width
      
      pdf.save(`${student.name}_Result.pdf`);
    } catch (err) {
      console.error("PDF Generation Error", err);
      alert("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (error) return (
    <div className="text-center p-10 space-y-4">
      <h2 className="text-xl text-red-600 font-bold">{error}</h2>
      <Button onClick={() => navigate('/')}>Go Back</Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="w-full max-w-4xl flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>
        <div className="flex gap-2">
           <Button variant="secondary" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPDF} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" /> {downloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <div className="w-full max-w-3xl shadow-2xl print:shadow-none print:w-full">
        {/* Render Result Card */}
        <ResultCard 
          ref={cardRef} 
          theme={theme} 
          settings={settings} 
          student={student} 
          config={config} 
        />
      </div>
    </div>
  );
}
