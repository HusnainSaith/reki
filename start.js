// Preload .env before webpack bundle runs.
// Resolve paths relative to this file so the script works from any cwd.
const path = require('path');
process.chdir(__dirname);
require('dotenv').config({ path: path.join(__dirname, '.env') });
require(path.join(__dirname, 'dist', 'main'));
