import * as vscode from 'vscode';
import { runYED } from './commandRunner';

async function handle(mode: 'encrypt' | 'decrypt') {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {return;}

  const selection = editor.document.getText(editor.selection);
  if (!selection) {return;}

  try {
    const result = await runYED(mode, selection);
    await editor.edit(edit => {
      edit.replace(editor.selection, result);
    });
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message || String(err));
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('yed.encrypt', () => handle('encrypt')),
    vscode.commands.registerCommand('yed.decrypt', () => handle('decrypt'))
  );
}
