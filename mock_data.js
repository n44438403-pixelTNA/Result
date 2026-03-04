import { db } from './src/lib/db.js';

async function seed() {
    console.log("Seeding dummy data...");

    await db.createSession("2026-27");
    await db.createClass("2026-27", "Class 10");

    const config1 = {
        subjectGroups: [
            { subjectName: 'Math', tests: [{ id: 't1', name: 'Written', maxMarks: 100 }] },
            { subjectName: 'Science', tests: [{ id: 't2', name: 'Written', maxMarks: 100 }] }
        ]
    };

    const config2 = {
        subjectGroups: [
            { subjectName: 'Math', tests: [{ id: 't1', name: 'Written', maxMarks: 100 }] },
            { subjectName: 'Science', tests: [{ id: 't2', name: 'Written', maxMarks: 100 }] }
        ]
    };

    await db.saveExamConfig("2026-27", "Class 10", "Term 1", config1);
    await db.saveExamConfig("2026-27", "Class 10", "Term 2", config2);

    await db.saveStudentResult("2026-27", "Class 10", "Term 1", { rollNo: '1', name: 'John Doe', marks: { 't1': 80, 't2': 90 }});
    await db.saveStudentResult("2026-27", "Class 10", "Term 2", { rollNo: '1', name: 'John Doe', marks: { 't1': 85, 't2': 95 }});

    console.log("Done.");
}
seed();
