import dotenv from 'dotenv';
dotenv.config();

console.log("RAW ENVIRONMENT VARIABLES:");
console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "DEFINED" : "UNDEFINED", `(${process.env.VITE_SUPABASE_URL})`);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "DEFINED" : "UNDEFINED", `(${process.env.SUPABASE_URL})`);
console.log("VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? "DEFINED" : "UNDEFINED");
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "DEFINED" : "UNDEFINED");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "DEFINED" : "UNDEFINED");
