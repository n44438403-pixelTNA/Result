import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Trash, Plus, FolderPlus } from 'lucide-react';

export default function ExamParams({ config, onSave }) {
  // New State structure: subjectGroups = [ { subjectName: 'Math', tests: [ {id, name, date, maxMarks} ] } ]
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState('');

  useEffect(() => {
    if (config) {
      if (config.subjectGroups && Array.isArray(config.subjectGroups)) {
        setSubjectGroups(config.subjectGroups);
      } else if (config.tests && Array.isArray(config.tests)) {
        // Migrate flat tests to a "General" subject group
        setSubjectGroups([{ subjectName: 'General', tests: config.tests }]);
      } else if (config.subjects && Array.isArray(config.subjects)) {
        // Migrate old array of strings config format
        const migratedGroups = config.subjects.map((sub, index) => ({
          subjectName: sub,
          tests: [{
            id: `test_${Date.now()}_${index}`,
            name: `${sub} 1`,
            maxMarks: config.maxMarks || 100,
            date: ''
          }]
        }));
        setSubjectGroups(migratedGroups);
      } else {
        setSubjectGroups([]);
      }
    }
  }, [config]);

  const addSubjectGroup = () => {
    const name = newSubjectName.trim() || `Subject ${subjectGroups.length + 1}`;
    setSubjectGroups([...subjectGroups, { subjectName: name, tests: [] }]);
    setNewSubjectName('');
  };

  const removeSubjectGroup = (groupIndex) => {
    if(confirm('Delete this subject and all its tests?')) {
        const updated = [...subjectGroups];
        updated.splice(groupIndex, 1);
        setSubjectGroups(updated);
    }
  };

  const updateSubjectName = (groupIndex, newName) => {
    const updated = [...subjectGroups];
    updated[groupIndex] = { ...updated[groupIndex], subjectName: newName };
    setSubjectGroups(updated);
  };

  const addTestToGroup = (groupIndex) => {
    const updated = [...subjectGroups];
    const group = { ...updated[groupIndex] };
    const newTest = {
      id: `test_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      name: `Test ${group.tests.length + 1}`,
      maxMarks: 100,
      date: new Date().toISOString().split('T')[0]
    };
    group.tests = [...group.tests, newTest];
    updated[groupIndex] = group;
    setSubjectGroups(updated);
  };

  const updateTest = (groupIndex, testId, field, value) => {
    const updated = [...subjectGroups];
    const group = { ...updated[groupIndex] };
    group.tests = group.tests.map(test => test.id === testId ? { ...test, [field]: value } : test);
    updated[groupIndex] = group;
    setSubjectGroups(updated);
  };

  const removeTest = (groupIndex, testId) => {
    const updated = [...subjectGroups];
    const group = { ...updated[groupIndex] };
    group.tests = group.tests.filter(test => test.id !== testId);
    updated[groupIndex] = group;
    setSubjectGroups(updated);
  };

  const handleSave = () => {
    onSave({ subjectGroups });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <span>Exam Subjects & Columns</span>
          <div className="flex items-center gap-2">
              <Input
                 placeholder="New Subject Name"
                 value={newSubjectName}
                 onChange={e => setNewSubjectName(e.target.value)}
                 className="h-9 w-40"
              />
              <Button variant="outline" size="sm" onClick={addSubjectGroup}>
                <FolderPlus className="h-4 w-4 mr-2" /> Add Subject
              </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {subjectGroups.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No subjects added. Add a subject to start creating test columns.</p>
        ) : (
          <div className="space-y-6">
            {subjectGroups.map((group, gIndex) => (
              <div key={gIndex} className="border rounded-md overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b">
                      <div className="flex items-center gap-2 font-semibold">
                          Subject:
                          <Input
                            value={group.subjectName}
                            onChange={(e) => updateSubjectName(gIndex, e.target.value)}
                            className="h-7 w-48 font-semibold bg-white"
                          />
                      </div>
                      <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => addTestToGroup(gIndex)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8">
                             <Plus className="h-4 w-4 mr-1" /> Add Test
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeSubjectGroup(gIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2">
                             <Trash className="h-4 w-4" />
                          </Button>
                      </div>
                  </div>
                  <div className="p-4 bg-white">
                     {group.tests.length === 0 ? (
                         <p className="text-sm text-gray-400 italic">No tests created for this subject yet.</p>
                     ) : (
                         <div className="space-y-3">
                            {group.tests.map((test) => (
                            <div key={test.id} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex-1 w-full">
                                <label className="block text-xs font-medium mb-1 text-gray-500">Test Column Name</label>
                                <Input
                                    value={test.name}
                                    onChange={(e) => updateTest(gIndex, test.id, 'name', e.target.value)}
                                    placeholder="e.g. Unit Test 1"
                                    className="h-9"
                                />
                                </div>
                                <div className="w-full sm:w-32">
                                <label className="block text-xs font-medium mb-1 text-gray-500">Date</label>
                                <Input
                                    type="date"
                                    value={test.date}
                                    onChange={(e) => updateTest(gIndex, test.id, 'date', e.target.value)}
                                    className="h-9"
                                />
                                </div>
                                <div className="w-full sm:w-24">
                                <label className="block text-xs font-medium mb-1 text-gray-500">Full Marks</label>
                                <Input
                                    type="number"
                                    value={test.maxMarks}
                                    onChange={(e) => updateTest(gIndex, test.id, 'maxMarks', parseInt(e.target.value) || 0)}
                                    className="h-9"
                                />
                                </div>
                                <div className="w-full sm:w-48">
                                <label className="block text-xs font-medium mb-1 text-gray-500" title="Visible if any student has 'X'">Class Closed Reason</label>
                                <Input
                                    value={test.closedReason || ''}
                                    onChange={(e) => updateTest(gIndex, test.id, 'closedReason', e.target.value)}
                                    placeholder="e.g. Holiday, Rain"
                                    className="h-9"
                                />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeTest(gIndex, test.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 shrink-0">
                                <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                            ))}
                         </div>
                     )}
                  </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 flex justify-end pt-4 border-t">
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </CardContent>
    </Card>
  );
}
