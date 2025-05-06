import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import { ensureBinaryUpToDate } from './binaryManager';

export async function runYED(mode: 'encrypt' | 'decrypt', input: string): Promise<string> {
  const configPath = `${vscode.workspace.rootPath}/.yed_config.yml`;
  if (!fs.existsSync(configPath)) {
    throw new Error('.yed_config.yml not found');
  }

  const binaryPath = await ensureBinaryUpToDate();

  return new Promise((resolve, reject) => {
    const proc = cp.spawn(binaryPath, [mode, '--config', configPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => output += data.toString());
    proc.stderr.on('data', (data) => error += data.toString());

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(error || `YED exited with code ${code}`);
      }
      resolve(output.trim());
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}
