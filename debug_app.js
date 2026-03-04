import { db } from './src/lib/db.js';

async function test() {
   try {
     console.log("Fetching getExams...");
     const examsList = await db.getExams("N2025", "1");
     console.log("Exams:", examsList);

     console.log("Fetching getSessionDetails...");
     const details = await db.getSessionDetails("N2025");
     console.log("Details:", details);

     process.exit(0);
   } catch(e) {
     console.error(e);
   }
}
test();
