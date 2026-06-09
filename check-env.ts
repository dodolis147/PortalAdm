
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { loadAndValidateEnvironment } from './src/config/env-server';

console.log("Environment validation result:");
console.log(JSON.stringify(loadAndValidateEnvironment(), null, 2));
