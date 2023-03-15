import { Express, Request, Response } from "express";
import { DalleAPI } from "./classes/dalle";

export class POST {
    dalle: DalleAPI = new DalleAPI();
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
            // generates image
            case 'generateImage':
                // all fields
                if (!POST || !POST.prompt) {
                    let err = "Bad request, no prompt";
                    console.log(err);
                    res.status(400).send({ err });
                    return;
                };
                
                // generate
                this.dalle.generateImage(POST.prompt).then(resolve => {
                    res.status(200).send({ resolve });
                    return;
                }).catch(err => {
                    res.status(500).send({ err });
                });

                break;
            
            case 'getVariations':
                if (!POST || !POST.prompt || !POST.img) {
                    let err = "Bad request, no prompt";
                    console.log(err);
                    res.status(400).send({ err });
                    return;
                };

                this.dalle.getVariations(POST.image.image).then(resolve => {
                    res.status(200).send({ resolve });
                    return;
                })

                break;

            case 'test':
                res.status(200).send({ "Status" : 'Ok' })
                break;

            default:
            res.status(500).send(`Action ${action} did not resolve`)
            break;
        }
    }
}