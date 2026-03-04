import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Trash } from 'lucide-react';

export default function ExamParams({ config, onSave }) {
  const [subjects, setSubjects] = useState(config?.subjects || []);
  const [maxMarks, setMaxMarks] = useState(config?.maxMarks || 100);
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    if (config) {
      setSubjects(config.subjects || []);
      setMaxMarks(config.maxMarks || 100);
    }
  }, [config]);

  const addSubject = () => {
    if (newSubject && !subjects.includes(newSubject)) {
      setSubjects([...subjects, newSubject]);
      setNewSubject('');
    }
  };

  const removeSubject = (sub) => {
    setSubjects(subjects.filter(s => s !== sub));
  };

  const handleSave = () => {
    onSave({ maxMarks: parseInt(maxMarks), subjects });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Exam Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Max Marks (per subject)</label>
            <Input
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Add Subject</label>
            <div className="flex gap-2">
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
              />
              <Button onClick={addSubject} type="button">Add</Button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Subjects List:</h4>
          <div className="flex flex-wrap gap-2">
            {subjects.length === 0 && <span className="text-gray-500 text-sm">No subjects added.</span>}
            {subjects.map((sub) => (
              <div key={sub} className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
                {sub}
                <button onClick={() => removeSubject(sub)} className="ml-2 text-red-500 hover:text-red-700">
                  <Trash className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </CardContent>
    </Card>
  );
}
