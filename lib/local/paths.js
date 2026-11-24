import path from 'path';

// Where the local data lives. Normally the "data" folder; the automated tests point DATA_DIR at their own separate folder
// so they can never touch your real website data or your real admin password.
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
