import * as vscode from 'vscode';
import { parseDocument, stringify } from 'yaml';

export async function addRule(rule: string): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!root) { return; }

  const uri = vscode.Uri.joinPath(root, '.yed_config.yml');
  let doc;
  try {
    const raw = (await vscode.workspace.fs.readFile(uri)).toString();
    doc = parseDocument(raw);
  } catch {
    doc = parseDocument('rules: []');
  }

  const rules = doc.get('rules') as unknown;
  if (Array.isArray(rules) && !rules.includes(rule)) {
    rules.push(rule);
  }

  await vscode.workspace.fs.writeFile(uri, Buffer.from(stringify(doc)));
}