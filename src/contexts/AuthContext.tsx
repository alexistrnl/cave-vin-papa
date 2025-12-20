"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextType {
  isReady: boolean;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isReady: false,
  userId: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Vérifier si l'utilisateur est déjà connecté
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Erreur lors de la récupération de la session:", sessionError);
          setIsReady(true); // On marque comme prêt même en cas d'erreur pour éviter de bloquer
          return;
        }

        if (session?.user?.id) {
          // Session existante
          setUserId(session.user.id);
          setIsReady(true);
          return;
        }

        // Pas de session : authentification anonyme
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

        if (authError) {
          console.error("Erreur lors de l'authentification anonyme:", authError);
          setIsReady(true); // On marque comme prêt même en cas d'erreur pour éviter de bloquer
          return;
        }

        if (authData?.user?.id) {
          setUserId(authData.user.id);
          console.log("Authentification anonyme réussie, user_id:", authData.user.id);
        }

        setIsReady(true);
      } catch (error) {
        console.error("Erreur inattendue lors de l'initialisation de l'authentification:", error);
        setIsReady(true); // On marque comme prêt même en cas d'erreur pour éviter de bloquer
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isReady, userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

