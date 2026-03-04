import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateEmail,
  updatePassword
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
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      // Legacy auto-creation for the main admin if the account doesn't exist yet
      if (email === 'nadimanwar794@gmail.com' && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
         try {
             // Force password to be at least 6 chars for firebase if they type a short one
             let padded = password;
             while(padded.length < 6) padded += 'X';

             await createUserWithEmailAndPassword(auth, email, padded);
             return true;
         } catch (createErr) {
             console.error("Login/Create Error:", createErr);
             return false;
         }
      }
      console.error("Login Error:", error);
      return false;
    }
  };

  const registerAdmin = async (email, password) => {
    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
      await createUserWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      console.error("Registration Error:", error);
      return { success: false, message: error.message };
    }
  };

  const updateAdminEmail = async (newEmail) => {
    try {
      if (auth.currentUser) {
        await updateEmail(auth.currentUser, newEmail);
        return { success: true };
      }
      return { success: false, message: "No user logged in." };
    } catch (error) {
      console.error("Update Email Error:", error);
      // Commonly throws if recent login is required.
      return { success: false, message: error.message };
    }
  };

  const updateAdminPassword = async (newPassword) => {
    try {
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        return { success: true };
      }
      return { success: false, message: "No user logged in." };
    } catch (error) {
      console.error("Update Password Error:", error);
      // Commonly throws if recent login is required.
      return { success: false, message: error.message };
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
    <AuthContext.Provider value={{ user, login, logout, registerAdmin, updateAdminEmail, updateAdminPassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
