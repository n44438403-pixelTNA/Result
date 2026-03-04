import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      // Firebase requires passwords to be at least 6 characters.
      // Since the requested password is 'NSTA' (4 chars), we pad it behind the scenes.
      const firebasePassword = (email === 'nadimanwar794@gmail.com' && password === 'NSTA')
        ? 'NSTA123'
        : password;

      // Must authenticate with Firebase so we get a valid auth token to write to the database
      await signInWithEmailAndPassword(auth, email, firebasePassword);
      return true;
    } catch (error) {
      console.error("Login Error:", error);

      // Auto-create the admin account if it doesn't exist yet
      if (email === 'nadimanwar794@gmail.com' && password === 'NSTA') {
        try {
          console.log("Attempting to auto-create admin account...");
          await createUserWithEmailAndPassword(auth, email, 'NSTA123');
          return true;
        } catch (createError) {
          console.error("Auto-creation failed:", createError);
          return false;
        }
      }

      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
