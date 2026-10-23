import { spawnSync } from 'node:child_process';
import path from 'node:path';

const javaHome = 'C:\\Users\\Claus\\.jdks\\jdk-21.0.4+7-jre';
const javaBin = path.join(javaHome, 'bin');

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: `${javaBin};${process.env.PATH || ''}`,
};

const firebaseBin = path.resolve(process.cwd(), 'node_modules/firebase-tools/lib/bin/firebase.js');

const result = spawnSync(
  process.execPath,
  [
    firebaseBin,
    'emulators:exec',
    '--only',
    'firestore',
    'scripts\\test-rules.cmd',
  ],
  {
    stdio: 'inherit',
    env,
    shell: true,
  }
);

process.exit(result.status ?? 0);
