import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const GH_REPO = 'atlet99/yaml-encrypter-decrypter';
const BIN_DIR = path.join(__dirname, '..', 'bin');

function getPlatformAssetName(): string {
  const platform = os.platform();
  if (platform === 'win32') {return 'yed.exe';}
  if (platform === 'darwin') {return 'yed.darwin';}
  if (platform === 'linux') {return 'yed.linux';}
  throw new Error('Unsupported platform');
}

function getBinaryPath(): string {
  return path.join(BIN_DIR, getPlatformAssetName());
}

export async function ensureBinaryUpToDate(): Promise<string> {
  const binaryPath = getBinaryPath();
  if (fs.existsSync(binaryPath)) {return binaryPath;}

  vscode.window.showInformationMessage('Downloading YED binary...');
  const latestReleaseUrl = `https://api.github.com/repos/${GH_REPO}/releases/latest`;

  const releaseData = await fetchJSON(latestReleaseUrl);
  const asset = releaseData.assets.find((a: any) =>
    a.name === getPlatformAssetName()
  );

  if (!asset) {throw new Error('Binary not found for your platform');}

  await downloadFile(asset.browser_download_url, binaryPath);

  if (os.platform() !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  return binaryPath;
}

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'VSCode-YED-Extension' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'VSCode-YED-Extension' } }, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}
