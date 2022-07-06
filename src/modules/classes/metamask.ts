import { Account } from "./account";


export class Metamask {
    private account : Account

    constructor(){
        this.account = new Account()
    }

    registerMetamask(message : string, username: string, email : string) : Promise<any>{
        return new Promise((resolve, reject)=>{
            this.account.getNonce(username).then(async (nonce : string) => {
                let data: RegisterData = JSON.parse(this.account.decrypt(message));
                
                if (data.nonce != nonce) {
                    console.log('Nonce Err', data.nonce, nonce);
                    reject('Invalid parameters')
                }
                if (data.username != username) {
                    console.log('Username Err');
                    reject('Invalid parameters')
                }
                let key = await this.account.generateKeySeed(username, data.signature);
                if (data.pub_key != key.pub_key) {
                    console.log('Key Err');
                    reject('Invalid parameters')
                }

                this.account.createAccount({
                    username,
                    firstName: '',
                    lastName: '',
                    email,
                    phone: '',
                    DOB: new Date(),
                    currency: 'USD',
                    location: '',
                    address: data.address,
                    key: data.pub_key
                })
                .then((response) => { resolve(response) })
                .catch((err)     => { reject(err) })
            }).catch((err) => { reject(err) })
        })
    }
}


interface RegisterData {
    nonce:string;
    pub_key:string;
    username:string;
    signature:string;
    address: string;
}
