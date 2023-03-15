import { Dalle } from "node-dall-ai-2";
import { generationType } from "node-dall-ai-2/build/Dalle";
import { OpenAIApi } from "openai";
import { CreateImageRequest, ImagesResponse } from "openai/dist/api";
import { Configuration } from "openai/dist/configuration";
import https from 'https';
import axios from 'axios';
import fs from 'fs-extra';
import * as stream from 'stream';
import { promisify } from 'util';
import mime from "mime";
import path from "path";

// if the return on the reject statement is janky on any of the error handling, just put the reject above the return line.
export class DalleAPI {
    openai: OpenAIApi;
    filePath = "./created_images/";
    constructor() {
        const configuration = new Configuration({
            apiKey: global.config.dalle_api_key,
        }); 

        this.openai = new OpenAIApi(configuration);
    }

    generateImage(prompt: string, amount?: number): Promise<ImagesResponse> {
        return new Promise(async (resolve, reject) => {

            let requestConfig: CreateImageRequest = {
                prompt,
                n: 4,
                size: "1024x1024"
            };

            let images = await this.openai.createImage(requestConfig).catch(err => {
                reject(err);
            });

            if (!images) return;
            // console.log(images.data);

            resolve(images.data);
        });
    }

    async getVariations(image: any) {
        return new Promise(async (resolve, reject) => {

            let variations = await this.openai.createImageVariation(image, 4).catch(err => {
                console.log({ err });
                
                reject(err)
            })

            // console.log({ variations });
            resolve(variations.data)
        })
    }

    async variate(url: string) {
        let file_name = `${new Date().getTime()}.png`;
        let file_path = path.join(global.paths.root, 'created_images', file_name)
        console.log({ path });
        const response = await fetch(url);
        console.log({ response });
        const blob = await response.blob();
        console.log({ blob });
        const arrayBuffer = await blob.arrayBuffer();
        console.log({ arrayBuffer });
        const buffer = Buffer.from(arrayBuffer);
        console.log({ buffer });
        await fs.writeFile(file_path, buffer).then((result) => {
            console.log({result});
             
        }).catch((error) => {
            console.log({error});
             
        })

        let file_buffer = await fs.readFile(file_path);
        let file_blob = new Blob([file_buffer]);
        let file = this.blobToFile(file_blob, "image.png");
        
        // let read = fs.createReadStream(file_path);
        // let vars = await (<any>this.openai).createImageVariation(, 4);
        // await fs.promises.writeFile(file_path, buffer);
        return true;
    }

    blobToFile(theBlob: Blob, fileName:string): File {
        var b: any = theBlob;
        //A Blob() is almost a File() - it's just missing the two properties below which we will add
        b.lastModifiedDate = new Date();
        b.name = fileName;
    
        //Cast to a File() type
        return <File>theBlob;
    }
    // getTask(task_id: string): Promise<any> {
    //     return new Promise(async (resolve, reject) => {
    //         let task = await this.dalle.getTask(task_id).catch(err => {
    //             let _err = "Error getting Task with ID: " + task_id;
    //             console.log({ _err });
    //             return reject(err + ' ' + _err);
    //         });

    //         if (!task) {
    //             return reject("No task");
    //         }
    //         resolve(task);
    //     });
    // }

    // getList(list_id: number): Promise<any> {
    //     return new Promise(async (resolve, reject) => {
    //         let list = await this.dalle.getList(list_id).catch(err => {
    //             let _err = "Error getting list with list id: " + list_id;
    //             console.log({ err });
    //             return reject(err + ' ' + _err);
    //         });

    //         if (!list) {
    //             return reject('No list found');
    //         }
    //         resolve(list);
    //     });
    // }

    // getCredits(): Promise<any> {
    //     return new Promise(async (resolve, reject) => {
    //         let credits = await this.dalle.getCredits().catch(err => {
    //             let _err = "Error getting credits";
    //             console.log({ err });
    //             return reject(err + ' ' +  _err);
    //         }); 

    //         if (!credits) {
    //             return reject("Error getting credits");
    //         }

    //         resolve(credits);
    //     });
    // }
}