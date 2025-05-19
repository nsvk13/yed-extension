import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { promisify } from 'node:util';
import * as https from 'node:https';
import * as vscode from 'vscode';

const mkdir = promisify(fs.mkdir);
const chmod = promisify(fs.chmod);
const pipeline = promisify(require('node:stream').pipeline);

type Triple = `${NodeJS.Platform}-${NodeJS.Architecture}`;

const BIN_MAP: Partial<Record<Triple, string>> = {
  'win32-x64':   'yed.exe',
  'win32-arm64': 'yed.exe',
  'darwin-x64':   'yed.darwin',
  'darwin-arm64': 'yed.darwin',
  'linux-x64':   'yed.linux',
  'linux-arm64': 'yed.linux',
};

export class CliManager {
  private readonly binRoot = path.join(
    vscode.workspace.getConfiguration().get<string>('yed.cliCacheDir')
      ?? path.join(os.homedir(), '.yed', 'bin'),
  );

  async getCli(version: string): Promise<string> {
    const triple = `${process.platform}-${process.arch}` as Triple;
    const asset = BIN_MAP[triple];
    if (!asset) {
      throw new Error(`YED: unsupported platform/arch ${triple}`);
    }

    const binPath = path.join(this.binRoot, version, asset);
    if (fs.existsSync(binPath)) {
      return binPath;
    }

    await mkdir(path.dirname(binPath), { recursive: true });
    const url = `https://github.com/atlet99/yaml-encrypter-decrypter/releases/download/${version}/${asset}`;

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Downloading yed ${version}` },
      () => this.download(url, binPath),
    );

    if (process.platform !== 'win32') {
      await chmod(binPath, 0o755);
    }
    return binPath;
  }

  /** download helper */
  private async download(url: string, dest: string, depth = 0): Promise<void> {
    if (depth > 5) {
      throw new Error('Too many redirects');
    }
  
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'VSCode-YED' } }, (res) => {
        const status = res.statusCode ?? 0;
  
        if ([301, 302, 307, 308].includes(status)) {
          const next = res.headers.location;
          res.resume();
          if (next) {
            return this.download(next, dest, depth + 1).then(resolve).catch(reject);
          }
          return reject(new Error(`Redirect ${status} without Location header`));
        }
  
        if (status === 200) {
          return pipeline(res, fs.createWriteStream(dest)).then(resolve).catch(reject);
        }
  
        reject(new Error(`HTTP ${status}`));
      }).on('error', reject);
    });
  }
}
