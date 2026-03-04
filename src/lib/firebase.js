// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8HAnSpjO7ljNPzYNamfopTPLblr0ErSU",
  authDomain: "nsta-b09a4.firebaseapp.com",
  databaseURL: "https://nsta-b09a4-default-rtdb.firebaseio.com",
  projectId: "nsta-b09a4",
  storageBucket: "nsta-b09a4.firebasestorage.app",
  messagingSenderId: "874802599278",
  appId: "1:874802599278:web:79406811f06f0352f31d7f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
