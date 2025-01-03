import * as vscode from 'vscode';
import { WebSocketServer } from 'ws';

import Client from './networking/Client';

export function activate(context: vscode.ExtensionContext) {
	const clients = new Map<string, Client>();

	// Create the websocket server
	const wss = new WebSocketServer({
		port: vscode.workspace.getConfiguration().get('vsc-roblox-executor.port')
	});

	wss.on('connection', (ws) => {
		let id = Math.random().toString(36).substring(7);
		while (clients.has(id)) {
			id = Math.random().toString(36).substring(7);
		}

		const client = new Client(ws);
		clients.set(id, client);

		ws.on('close', () => {
			clients.delete(id);
		});
	});

	wss.on('error', (err) => {
		vscode.window.showErrorMessage(`WebSocket server error: ${err}`);
	});

	wss.on('close', () => {
		vscode.window.showInformationMessage('WebSocket server closed.');
	});
	
	function executeFileContents(fileContents: string) {
		if (!wss) {
			vscode.window.showErrorMessage('WebSocket server not initialized.');
			return;
		}
		
		for (const client of clients.values()) {
			client.execute(fileContents);
		}
	}

	vscode.window.showInformationMessage('vsc-roblox-executor extension activated, server running.');

	if (!wss) {
		vscode.window.showErrorMessage('Failed to start WebSocket server.');
	}

	// Register the commands
	context.subscriptions.push(vscode.commands.registerCommand('vsc-roblox-executor.run', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}

		// Fetch the file contents
		const fileContents = editor.document.getText();
		if (!fileContents) {
			vscode.window.showErrorMessage('No file contents found.');
			return;
		}

		// Execute the file contents
		vscode.window.showInformationMessage('Executing...');
		executeFileContents(fileContents);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vsc-roblox-executor.runBound', async () => {
		const boundFile = vscode.workspace.getConfiguration().get('vsc-roblox-executor.file');

		// Search for the bound file in the workspace
		const foundFile = await vscode.workspace.findFiles(boundFile as string);
		if (!foundFile || foundFile.length === 0) {
			vscode.window.showErrorMessage(`Could not find file: ${boundFile}`);
			return;
		}

		if (foundFile.length > 1) {
			vscode.window.showErrorMessage(`Found multiple files with the name: ${boundFile} (expected 1), please specify a more specific file path.`);
			return;
		}

		// Read the file contents
		const fileContents = await vscode.workspace.fs.readFile(foundFile[0]).then((contents) => {
			return new TextDecoder().decode(contents);
		});

		// Execute the file contents
		vscode.window.showInformationMessage('Executing bound file...');
		executeFileContents(fileContents);
	}));
}
