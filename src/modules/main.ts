import { Express } from 'express';
import express from 'express';
import session from 'express-session';
import Cors from 'cors';
import http from 'http';

/*
    Type Definitions
*/
import { Server } from 'node:http';
import { GET } from './get';
import { POST } from './post';
import { Socket } from './classes/socket';
import { Discord } from './classes/discord';
import { Bot } from './classes/bot/bot';
import { DalleAPI } from './classes/dalle';

var cron = require('node-cron');

declare global {
    namespace NodeJS {
        interface Global {
            bot: Bot;
            discord: Discord;
            foundEndpoint?: {
                endpoint?: string;
                promise?: Promise<string>;
            }
        }
    }
}

export class Main {
    httpServer: Server;
    get: GET;
    post: POST;
    socket: Socket;

    constructor(
        private app: Express ){
        
        this.app.set('trust proxy', 1);
        this.app.use(express.urlencoded({extended: false}));
        this.app.use(express.json());
        this.app.use(Cors());
        this.app.use(session({
            secret: 'some secret change later',
            resave: true,
            saveUninitialized: true,
            cookie: { 
                expires: new Date(new Date().getTime() + 300000),
                secure: false,
                sameSite: true
            }
        }));
        
        this.get = new GET(this.app);
        this.post = new POST(this.app);
        this.httpServer = http.createServer(this.app);
        this.socket = new Socket(this.httpServer);
        this.serverListen();

        // let dalle = new DalleAPI();

        // let images = dalle.generateImage("giant taco").catch(err => {
        //     console.log({ err }); 
        // });

        // console.log({ images });

        // dalle.variate("https://sabe.io/images/saturn.png").then(() => {
        //     console.log('yes');
        // }).catch(err => {
        //     console.log({ err });
        // })
        // global.discord = new Discord();
        // global.bot = new Bot();
    }

    async serverListen() {
        this.httpServer.listen(3000, () => {
            console.log('> HTTP listening on port: '+3000);
        })
    }
}