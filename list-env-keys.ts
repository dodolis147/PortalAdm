import dotenv from 'dotenv';
dotenv.config();

console.log("ALL ENV KEYS:", Object.keys(process.env).filter(k => !k.includes("KEY") && !k.includes("PASSWORD") && !k.includes("SECRET")));
