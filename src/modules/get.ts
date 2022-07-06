import { Express, Request, Response } from 'express';
import { DataBase } from './classes/database';

export class GET {
    db: DataBase;

    constructor(private app: Express) {
        this.db = new DataBase();
        this.app.get("*", (req, res) => { this.process(req, res); })
    }

    async process(req: Request, res: Response) {
        if(req && res) {
            var urlArr = req.originalUrl.split('?')[0].replace(/^\/+|\/+$/g, '').split('/');
            var GET: any = req.query;
            var protocol = req.protocol;

            switch(urlArr[0]) {
                case 'test':
                    res.status(200).send({ "Status" : 'Ok' })
                    break;
    
                default:
                    res.status(500).send(`Action ${urlArr[0]} did not resolve`)
                    break;
            }
        }
    }
}