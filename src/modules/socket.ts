import { Server } from "http";
import { Server as SocketServer } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { EventEmitter } from "stream";
import fs from 'fs-extra';
import axios from 'axios';
import path from 'path';

export class Socket extends EventEmitter{
    private io?: SocketServer;
    
    get ready() : boolean {
        return this.io !== undefined;
    }

    searching: string[] = []

    constructor(private server: Server) {
        super();
        
        this.io = new SocketServer(this.server, {
            allowEIO3: true,
            cors: {
                origin: "http://localhost:4200",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            
        });

        this.io.on('connection', (socket) => {
            console.log('CONNECTED');

            socket.on('load-matches', () => {
                socket.emit('matches-update', this.searching)
            });
            
            socket.on('search-match', () => {
                console.log('SEARCH');
                if(!this.searching.includes(socket.id)) {
                    this.searching.push(socket.id);
                    socket.emit('matches-update', this.searching)
                }
            });

            socket.on('disconnect', () => {
                console.log('DISCONNECTED');
            });
        })

    }
}