import { createClient } from "@supabase/supabase-js";

// Vérifier que les variables d'environnement sont définies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    // Côté client : afficher une erreur visible
    console.error(
      "❌ Erreur de configuration Supabase :\n" +
      "Les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises.\n" +
      "Vérifiez votre fichier .env.local ou vos variables d'environnement Vercel."
    );
  } else {
    // Côté serveur : log d'erreur
    console.error(
      "❌ Erreur de configuration Supabase : Variables d'environnement manquantes.\n" +
      "NEXT_PUBLIC_SUPABASE_URL: " + (supabaseUrl ? "✅" : "❌ manquant") + "\n" +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY: " + (supabaseAnonKey ? "✅" : "❌ manquant")
    );
  }
  
  // Créer un client factice pour éviter les crashes, mais il ne fonctionnera pas
  // En production, cela devrait faire échouer le build si les env sont manquantes
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Configuration Supabase invalide : Variables d'environnement manquantes. " +
      "Le déploiement ne peut pas continuer sans NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);
