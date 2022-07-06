import { Express, Request, Response } from "express";

export class POST {
    constructor(private app: Express) {
        this.app.post('*', (req, res) => { this.process(req, res); })
    }

    process(req: Request, res: Response) {
        let urlArr = req.originalUrl.replace(/^(\/)/, '').split('/');
        let GET : any | boolean = false
        if (req.originalUrl.split('?').length > 1){
            GET = {};
            req.originalUrl.split('?')[1].split('&').forEach((keyVal : any)=>{
                let splitKey = keyVal.split('=');
                GET[splitKey[0]] = !isNaN(splitKey[1]) ? Number(splitKey[1]) : decodeURI(splitKey[1]);
            });
        }
        let POST = req.body;
        let action = urlArr[0];

        switch(action) {
            case 'test':
                res.status(200).send({ "Status" : 'Ok' })
                break;

            default:
                res.status(500).send(`Action ${action} did not resolve`)
                break;
        }
    }
}