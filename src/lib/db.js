import { db } from './firebase'; // Firestore instance
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  addDoc
} from 'firebase/firestore';

const SETTINGS_DOC_ID = 'instituteSettings';
const COLLECTION_SESSIONS = 'sessions';

// Helper to handle safe gets
const safeGet = async (ref) => {
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("DB Error:", error);
    return null;
  }
};

export const dbService = {
  // Settings
  getInstituteSettings: async () => {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const data = await safeGet(docRef);
    return data || {
      instituteName: 'Demo Institute',
      tagline: 'Excellence in Education',
      directorName: 'Director Name',
      address: '123, Demo Street, City',
      logoUrl: 'https://via.placeholder.com/150',
      themeId: 'theme1'
    };
  },

  saveInstituteSettings: async (settings) => {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    // Use set with merge to create if not exists or update
    await setDoc(docRef, settings, { merge: true });
    return settings;
  },

  // Sessions: stored as documents in 'sessions' collection
  getSessions: async () => {
    try {
      const colRef = collection(db, COLLECTION_SESSIONS);
      const snap = await getDocs(colRef);
      // Return IDs (e.g. "2024-25")
      return snap.docs.map(d => d.id);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      throw error; // Let the caller handle the fallback
    }
  },
  
  createSession: async (sessionName) => {
    if (!sessionName) return;
    const docRef = doc(db, COLLECTION_SESSIONS, sessionName);
    // Just create an empty doc to signify existence
    await setDoc(docRef, { created: new Date() }, { merge: true });
    return sessionName;
  },

  getSessionDetails: async (sessionName) => {
    if (!sessionName) return {};
    try {
      const docRef = doc(db, COLLECTION_SESSIONS, sessionName);
      const data = await safeGet(docRef);
      return data?.details || {
        instituteName: 'Demo Coaching Center',
        est: '2020',
        director: 'John Doe',
        mobile: '+91 0000000000',
        address: '123 Main Street, City'
      };
    } catch (error) {
       console.error("Error getting session details", error);
       return {};
    }
  },

  updateSessionDetails: async (sessionName, details) => {
    const docRef = doc(db, COLLECTION_SESSIONS, sessionName);
    await setDoc(docRef, { details }, { merge: true });
    return details;
  },

  // Classes: stored as subcollection 'classes' under session doc
  getClasses: async (session) => {
    try {
      const colRef = collection(db, COLLECTION_SESSIONS, session, 'classes');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.id);
    } catch (error) {
      console.error("Error fetching classes:", error);
      return [];
    }
  },
  
  createClass: async (session, className) => {
    if (!session || !className) return;
    const docRef = doc(db, COLLECTION_SESSIONS, session, 'classes', className);
    await setDoc(docRef, { created: new Date() }, { merge: true });
    return className;
  },

  // Exams: stored as subcollection 'exams' under class doc
  getExams: async (session, classId) => {
    try {
      const colRef = collection(db, COLLECTION_SESSIONS, session, 'classes', classId, 'exams');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.id);
    } catch (error) {
      console.error("Error fetching exams:", error);
      return [];
    }
  },

  // Exam Config & Students
  // Structure: sessions/{session}/classes/{classId}/exams/{examId} (doc)
  // Config stored in the exam doc itself.
  getExamConfig: async (session, classId, examId) => {
    const docRef = doc(db, COLLECTION_SESSIONS, session, 'classes', classId, 'exams', examId);
    const data = await safeGet(docRef);
    return data ? data.config : null;
  },

  saveExamConfig: async (session, classId, examId, config) => {
    const docRef = doc(db, COLLECTION_SESSIONS, session, 'classes', classId, 'exams', examId);
    await setDoc(docRef, { config }, { merge: true });
    return config;
  },
  
  // Students: stored as subcollection 'students' under exam doc
  getStudents: async (session, classId, examId) => {
    try {
      const colRef = collection(db, COLLECTION_SESSIONS, session, 'classes', classId, 'exams', examId, 'students');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.data());
    } catch (error) {
      console.error("Error fetching students:", error);
      return [];
    }
  },

  getStudentResult: async (session, classId, examId, rollNo) => {
    // Assuming rollNo is used as doc ID for easy lookup: `roll_101`
    const docId = `roll_${rollNo}`;
    const docRef = doc(db, COLLECTION_SESSIONS, session, 'classes', classId, 'exams', examId, 'students', docId);
    const data = await safeGet(docRef);
    return data;
  },

  saveStudentResult: async (session, classId, examId, studentData) => {
    const docId = `roll_${studentData.rollNo}`;
    const docRef = doc(db, COLLECTION_SESSIONS, session, 'classes', classId, 'exams', examId, 'students', docId);
    await setDoc(docRef, studentData);
    return studentData;
  },
  
  // Bulk save
  saveAllStudents: async (session, classId, examId, studentsList) => {
    const promises = studentsList.map(s => {
       const docId = `roll_${s.rollNo}`;
       const docRef = doc(db, COLLECTION_SESSIONS, session, 'classes', classId, 'exams', examId, 'students', docId);
       return setDoc(docRef, s);
    });
    await Promise.all(promises);
    return studentsList;
  }
};

// Export as 'db' to match previous usage
export { dbService as db };
