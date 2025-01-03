import * as vscode from 'vscode';

import WebSocket from 'ws';

import { randomBytes } from 'crypto';

import Packet from './packets/Packet';
import PacketHandler from './packets/PacketHandler';
import PacketId from './packets/PacketId';

import C01AuthenticationRequest from './packets/client/C01AutheticationRequest';
import C02ExecutionState, { ExecutionStateId } from './packets/client/C02ExecutionState';
import C03Output, { OutputId } from './packets/client/C03Output';
import S01AuthenticationResponse from './packets/server/S01AuthenticationResponse';
import S02ExecutionRequest from './packets/server/S02ExecutionRequest';
import S03Error, { ErrorId } from './packets/server/S03Error';

import EvictingMap from '../types/EvictingMap';

class Client {
    private static readonly handler: PacketHandler = new PacketHandler();

    static {
        this.handler.register(new C01AuthenticationRequest("", 0));
        this.handler.register(new C02ExecutionState(ExecutionStateId.SUCCESSFUL, "", 0));
        this.handler.register(new C03Output("", OutputId.PRINT));
        this.handler.register(new S01AuthenticationResponse(randomBytes(32).toString('base64')));
        this.handler.register(new S02ExecutionRequest(randomBytes(32).toString('base64'), "", 0));
        this.handler.register(new S03Error(ErrorId.AUTHENTICATION_REQUIRED));
    }

    private readonly connection: WebSocket;
    private readonly previousScripts: Map<number, string> = new EvictingMap(100);

    private authenticated: boolean = false;
    private encryptionKey: string = '';
    private username: string = '';
    private userId: number = -1;
    
    constructor(connection: WebSocket) {
        this.connection = connection;
        this.handle = this.handle.bind(this);
        connection.on('message', this.handle);
        connection.on('close', () => {
            vscode.window.showInformationMessage(`User ${this.username} disconnected.`);
            console.log(`User ${this.username} disconnected.`);
        });
    }

    private handle(message: string): void {
        const packet = Client.handler.handle(Packet.deserialise(message.toString()));
        if (!packet) {
            return;
        }
        
        // Handle authentication
        if (!this.authenticated) {
            console.log('User not authenticated, checking for authentication packet...');
            if (packet.id !== PacketId.CLIENT_AUTHENTICATION_REQUEST) {
                this.connection.send(new S03Error(ErrorId.AUTHENTICATION_REQUIRED).serialise());
                return;
            }


            const authPacket = C01AuthenticationRequest.deserialise(message.toString());
            this.encryptionKey = randomBytes(32).toString('base64');
            this.username = authPacket.username;
            this.userId = authPacket.userId;
            this.authenticated = true;

            // Acknowledge the authentication
            console.log(`User ${authPacket.username} authenticated as user ID ${this.userId}, assigned encryption key ${this.encryptionKey}.`);
            vscode.window.showInformationMessage(`User ${this.username} authenticated!`);
            this.connection.send(new S01AuthenticationResponse().serialise());
            return;
        }

        // Handle other packets
        switch (packet.id) {
            case PacketId.CLIENT_EXECUTION_STATE:
                const execPacket = C02ExecutionState.deserialise(message.toString());
                switch (execPacket.state) {
                    case ExecutionStateId.SUCCESSFUL:
                        break;
                    case ExecutionStateId.ERROR:
                        vscode.window.showErrorMessage(`Error executing script: ${execPacket.message}`);
                        break;
                    case ExecutionStateId.INVALID:
                        const script = this.previousScripts.get(execPacket.exectuionId);
                        if (!script) {
                            vscode.window.showErrorMessage('Invalid execution ID received from server! You\'ve likely executed too many scripts.');
                            return;
                        } else {
                            this.execute(script);
                        }
                        break;
                    default:
                        this.connection.send(new S03Error(ErrorId.INVALID_PACKET).serialise());
                        break;
                }
                break;
            case PacketId.CLIENT_OUTPUT:
                if (!vscode.workspace.getConfiguration().get('vsc-roblox-executor.showOutput')) {
                    return;
                }

                const outputPacket = C03Output.deserialise(message.toString());
                switch (outputPacket.type) {
                    case OutputId.PRINT:
                        vscode.window.showInformationMessage(outputPacket.message);
                        break;
                    case OutputId.WARNING:
                        vscode.window.showWarningMessage(outputPacket.message);
                        break;
                    case OutputId.ERROR:
                        vscode.window.showErrorMessage(outputPacket.message);
                        break;
                }
                break;
            default:
                this.connection.send(new S03Error(ErrorId.INVALID_PACKET).serialise());
                break;
        }
    }

    public execute(script: string): void {
        let id: number = Math.floor(Math.random() * 1000000);
        while (this.previousScripts.has(id)) {
            id = Math.floor(Math.random() * 1000000);
        }

        this.previousScripts.set(id, script);
        this.connection.send(new S02ExecutionRequest(script, id).serialise());
    }
}

export default Client;