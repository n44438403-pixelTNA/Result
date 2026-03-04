import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { FileText, UserCircle, Edit, Plus, Trash, Save, X } from 'lucide-react';
import { db } from '../lib/db';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [htmlBlocks, setHtmlBlocks] = useState([]);
  const [isEditingHtml, setIsEditingHtml] = useState(false);
  const [editingBlocks, setEditingBlocks] = useState([]);

  useEffect(() => {
    loadHtmlBlocks();
  }, []);

  const loadHtmlBlocks = async () => {
    const blocks = await db.getCustomHtmlBlocks();
    setHtmlBlocks(blocks);
  };

  const handleEditHtml = () => {
    setEditingBlocks([...htmlBlocks]);
    setIsEditingHtml(true);
  };

  const handleSaveHtml = async () => {
    await db.saveCustomHtmlBlocks(editingBlocks);
    setHtmlBlocks(editingBlocks);
    setIsEditingHtml(false);
  };

  const handleAddBlock = () => {
    setEditingBlocks([...editingBlocks, { id: Date.now().toString(), content: '<h2>New HTML Block</h2><p>Write your content here...</p>' }]);
  };

  const handleRemoveBlock = (id) => {
    setEditingBlocks(editingBlocks.filter(b => b.id !== id));
  };

  const handleBlockChange = (id, newContent) => {
    setEditingBlocks(editingBlocks.map(b => b.id === id ? { ...b, content: newContent } : b));
  };

  return (
    <div className="flex flex-col items-center mt-16 pb-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Result Portal</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Manage and view examination results efficiently. Students can view results organized by session, class, and exam. Administrators can securely edit results.
        </p>
      </div>

      <div className="flex justify-center w-full max-w-xl">
        <Card className="hover:shadow-lg transition-shadow w-full">
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
      </div>

      {/* Custom HTML Blocks Section */}
      <div className="w-full max-w-4xl mt-16 space-y-8">
        {user && !isEditingHtml && (
          <div className="flex justify-end mb-4">
            <Button onClick={handleEditHtml} variant="outline" className="flex items-center gap-2">
              <Edit className="h-4 w-4" /> Edit Page Content
            </Button>
          </div>
        )}

        {isEditingHtml ? (
          <Card className="border-blue-200 shadow-md">
            <CardHeader className="bg-blue-50 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-blue-800">Edit Custom HTML Blocks</CardTitle>
              <div className="flex gap-2">
                 <Button variant="ghost" size="sm" onClick={() => setIsEditingHtml(false)}>
                   <X className="h-4 w-4 mr-1" /> Cancel
                 </Button>
                 <Button size="sm" onClick={handleSaveHtml} className="bg-blue-600 hover:bg-blue-700">
                   <Save className="h-4 w-4 mr-2" /> Save Changes
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               {editingBlocks.map((block, index) => (
                 <div key={block.id} className="border rounded-md p-4 bg-gray-50 relative">
                   <div className="flex justify-between items-center mb-2">
                     <span className="font-semibold text-gray-700">Block #{index + 1}</span>
                     <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 h-8 w-8" onClick={() => handleRemoveBlock(block.id)}>
                       <Trash className="h-4 w-4" />
                     </Button>
                   </div>
                   <textarea
                     className="w-full h-32 p-3 border rounded text-sm font-mono focus:outline-blue-500"
                     value={block.content}
                     onChange={(e) => handleBlockChange(block.id, e.target.value)}
                     placeholder="<p>Enter valid HTML code here...</p>"
                   />
                 </div>
               ))}

               <Button onClick={handleAddBlock} variant="dashed" className="w-full border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 h-12 bg-transparent">
                 <Plus className="h-5 w-5 mr-2" /> Add New HTML Block
               </Button>
            </CardContent>
          </Card>
        ) : (
          htmlBlocks.map(block => (
            <div
               key={block.id}
               className="prose max-w-none w-full bg-white rounded-lg shadow-sm border p-6"
               dangerouslySetInnerHTML={{ __html: block.content }}
            />
          ))
        )}
      </div>


        {/* Hidden/Subtle Admin Login */}
        {!user && (
          <div className="mt-12 text-center w-full">
             <button onClick={() => navigate('/login')} className="text-[10px] text-gray-300 hover:text-gray-400 opacity-50">
               .
             </button>
          </div>
        )}

    </div>
  );
}
