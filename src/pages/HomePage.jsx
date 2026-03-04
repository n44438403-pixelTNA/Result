import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { FileText, UserCircle } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center mt-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Result Portal</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Manage and view examination results efficiently. Students can view results organized by session, class, and exam. Administrators can securely edit results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
             <CardTitle className="text-xl flex items-center justify-center gap-2">
               <FileText className="h-6 w-6 text-blue-600" /> View Results
             </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center p-6 space-y-4">
             <p className="text-center text-gray-500">
               Browse results by selecting an academic session, class, and examination.
             </p>
             <Button onClick={() => navigate('/browse')} className="w-full text-lg h-12" variant="default">
                Go to Results
             </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
             <CardTitle className="text-xl flex items-center justify-center gap-2">
               <UserCircle className="h-6 w-6 text-gray-700" /> Administration
             </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center p-6 space-y-4">
             <p className="text-center text-gray-500">
               Log in to manage sessions, classes, exams, and student result data.
             </p>
             <Button
                onClick={() => navigate('/login')}
                className="w-full text-lg h-12"
                variant={user ? "outline" : "secondary"}
             >
                {user ? "Logged In as Admin" : "Admin Login"}
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
