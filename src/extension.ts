import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import { CliManager } from './cliManager';
import { addRule } from './ruleWriter';

const cliManager = new CliManager();

export function activate(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('yed.encryptSelection', () => handleSelection('encrypt', ctx)),
    vscode.commands.registerCommand('yed.decryptSelection', () => handleSelection('decrypt', ctx)),
  );
}

async function handleSelection(action: 'encrypt' | 'decrypt', ctx: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('Нет активного редактора'); return; }

  const text = editor.document.getText(editor.selection).trim();
  if (!text) { vscode.window.showInformationMessage('Нет выделенного текста'); return; }

  const key = await ensureKey(ctx);
  if (!key) { return; }
  const cfg      = vscode.workspace.getConfiguration('yed');
  const version  = cfg.get<string>('version', 'v0.3.6');
  const binPath  = (cfg.get<string>('cliPath')?.trim()) || await cliManager.getCli(version);
  const validate = cfg.get<boolean>('validateRules', true);

  try {
    const result = await runCli(binPath, action, text, key, validate);
    await editor.edit((eb) => eb.replace(editor!.selection, result));

    if (action === 'encrypt') {
      await addRule(text);
    }
    vscode.window.showInformationMessage(`YED: ${action} выполнен`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`YED: ${err.message ?? err}`);
  }
}

async function ensureKey(ctx: vscode.ExtensionContext): Promise<string | undefined> {
  let key = await ctx.secrets.get('yedKey');
  if (key) { return key; }

  key = await vscode.window.showInputBox({
    password: true,
    title: 'YED key',
    placeHolder: 'Минимум 16 символов',
    validateInput: (v) => (v.length < 16 ? 'Ключ должен быть ≥ 16 символов' : undefined),
    ignoreFocusOut: true,
  });
  if (key) { await ctx.secrets.store('yedKey', key); }
  return key ?? undefined;
}

function runCli(
  bin: string,
  action: 'encrypt' | 'decrypt',
  value: string,
  key: string,
  validate: boolean,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args: string[] = ['-operation', action, '-key', key, '-value', value];
    if (validate) { args.push('--validate-rules'); }

    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';

    p.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    p.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    p.on('close', (code) => {
      if (code === 0) { resolve(out.trim()); }
      else { reject(new Error(err || `yed exit ${code}`)); }
    });
  });
}

export function deactivate(): void { /* NOP */ }
