import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Trash, Plus } from 'lucide-react';

export default function ExamParams({ config, onSave }) {
  const [tests, setTests] = useState([]);

  useEffect(() => {
    if (config) {
      if (config.tests && Array.isArray(config.tests)) {
        setTests(config.tests);
      } else if (config.subjects && Array.isArray(config.subjects)) {
        // Migrate old config format
        const migratedTests = config.subjects.map((sub, index) => ({
          id: `test_${Date.now()}_${index}`,
          name: sub,
          maxMarks: config.maxMarks || 100,
          date: ''
        }));
        setTests(migratedTests);
      } else {
        setTests([]);
      }
    }
  }, [config]);

  const addTest = () => {
    setTests([...tests, {
      id: `test_${Date.now()}`,
      name: `Test ${tests.length + 1}`,
      maxMarks: 100,
      date: new Date().toISOString().split('T')[0]
    }]);
  };

  const updateTest = (id, field, value) => {
    setTests(tests.map(test => test.id === id ? { ...test, [field]: value } : test));
  };

  const removeTest = (id) => {
    setTests(tests.filter(test => test.id !== id));
  };

  const handleSave = () => {
    // Save tests configuration
    onSave({ tests });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Exam Configuration (Tests/Columns)</span>
          <Button variant="outline" size="sm" onClick={addTest}>
            <Plus className="h-4 w-4 mr-2" /> Add Column
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tests.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No columns added. Add a column to start tracking marks.</p>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <div key={test.id} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium mb-1 text-gray-500">Column Name</label>
                  <Input
                    value={test.name}
                    onChange={(e) => updateTest(test.id, 'name', e.target.value)}
                    placeholder="e.g. Math 1"
                    className="h-9"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-xs font-medium mb-1 text-gray-500">Date</label>
                  <Input
                    type="date"
                    value={test.date}
                    onChange={(e) => updateTest(test.id, 'date', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="w-full sm:w-24">
                  <label className="block text-xs font-medium mb-1 text-gray-500">Full Marks</label>
                  <Input
                    type="number"
                    value={test.maxMarks}
                    onChange={(e) => updateTest(test.id, 'maxMarks', parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeTest(test.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 shrink-0">
                  <Trash className="h-4 w-4" />
                </Button>
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
