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
    // Firebase requires passwords to be at least 6 characters long.
    // We pad with 'X' up to 6 characters so old passwords like 'NSTA'
    // work if they were originally padded this way, but we MUST ALSO
    // check if it was previously padded with '123' by a previous version
    // of the codebase to prevent locking out the user.
    let genericPadded = password;
    while (genericPadded.length < 6) {
       genericPadded += 'X';
    }

    let legacyPadded = password;
    if (password === 'NSTA') {
        legacyPadded = 'NSTA123';
    }

    try {
      // Try logging in with generic padding first
      await signInWithEmailAndPassword(auth, email, genericPadded);
      return true;
    } catch (error) {
        try {
            // Try legacy padding just in case the account was already created with it
            await signInWithEmailAndPassword(auth, email, legacyPadded);
            return true;
        } catch (error2) {
             console.error("Login Error:", error2);

             // If both logins fail, attempt to auto-create the account using the legacy padded password
             // to maintain consistency with the user's previously created database if any
             try {
                console.log("Account not found. Attempting to auto-create...");
                await createUserWithEmailAndPassword(auth, email, legacyPadded);
                return true;
             } catch (createError) {
                console.error("Auto-creation failed:", createError);
                return false;
             }
        }
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
