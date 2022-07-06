import { JsonRpc, RpcError, Api } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { TextDecoder, TextEncoder } from 'text-encoding';
import { Contract, GetRowData, PushTransactionOptions, TransactionAuth } from './contract';
import { DataBase } from './database';
import axios from 'axios';

const ecc = require('eosjs-ecc')
const pbkdf2 = require('pbkdf2')
const CryptoJS = require("crypto-js");
const fetch = require('node-fetch');

const authorization : TransactionAuth[] = [{
    actor: 'airwire',
    permission: 'active',
}]

export class Account {
    contract: Contract;
    db: DataBase;

    AES_KEY : string
    AIRWIRE_ACTIVE_PRIVATE : string
    AIRWIRE_ACTIVE_PUBLIC : string
    API_ENDPOINT : string
    HYPERION : string

    constructor() {
        this.contract = new Contract()
        this.db = new DataBase()

        const { AES_KEY, AIRWIRE_ACTIVE_PRIVATE, AIRWIRE_ACTIVE_PUBLIC, API_ENDPOINT, HYPERION }
            = global.config.dev ? global.config.hosts.development : global.config.hosts.production

        this.AES_KEY = AES_KEY
        this.AIRWIRE_ACTIVE_PRIVATE = AIRWIRE_ACTIVE_PRIVATE
        this.AIRWIRE_ACTIVE_PUBLIC = AIRWIRE_ACTIVE_PUBLIC
        this.API_ENDPOINT = API_ENDPOINT
        this.HYPERION = HYPERION
    }

    async createAccount(user: User) {
        console.log("CREATE ACCOUNT for", user.username);
        const api = await this.contract.getAPI()

        return new Promise(async (res, rej) => {
            try {
                let actions: PushTransactionOptions[] = [
                    { // New system account
                        account: 'eosio',
                        name: 'newaccount',
                        authorization,
                        data: {
                            creator: 'airwire',
                            name: user.username,
                            owner: {
                                threshold: 1,
                                keys: [{
                                    key: this.AIRWIRE_ACTIVE_PUBLIC,
                                    weight: 1
                                }],
                                accounts: [],
                                waits: []
                            },
                            active: {
                                threshold: 1,
                                keys: [{
                                    key: user.key,
                                    weight: 1
                                }],
                                accounts: [],
                                waits: []
                            },
                        }
                    },
                    { // Buy ram for new account
                        account: 'eosio',
                        name: 'buyrambytes',
                        authorization,
                        data: {
                            payer: 'airwire',
                            receiver: user.username,
                            bytes: 51200,
                        },
                    },
                    { // Stake CPU and NET for new account
                        account: 'eosio',
                        name: 'delegatebw',
                        authorization,
                        data: {
                            from: 'airwire',
                            receiver: user.username,
                            stake_net_quantity: '0.50000000 WIRE',
                            stake_cpu_quantity: '0.50000000 WIRE',
                            transfer: false,
                        },
                    },
                    { // Add new account to users table
                        account: 'wire.users',
                        name: 'updateuser',
                        authorization,
                        data: {
                            user: user.username,
                            profileImgURL: user.profileImgURL,
                            data: CryptoJS.AES.encrypt(JSON.stringify({
                                username: user.username,
                                // password : user.password,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                phone: user.phone,
                                DOB: user.DOB,
                                currency: user.currency,
                                location: user.location,
                            }), this.AES_KEY).toString(),
                            key: user.key
                        }
                    }
                ];

                if(user.address) {
                    actions.push({
                        account: 'wire.users',
                        name: 'linkacc',
                        authorization,
                        data: {
                            user: user.username,
                            address: user.address.substring(2)
                        }
                    })
                }

                const result = await api.transact({ actions }, { blocksBehind: 3, expireSeconds: 30 });
                // console.log("RESULT", result);
                res(result)
            }
            catch (err) {
                console.log("Error on newaccount:", err);
                if (err instanceof RpcError)
                    rej(JSON.stringify(err.json, null, 2));
                else rej(JSON.stringify(err))
            }
        })
    }

    async pushTransaction(action: string, actor: string, data: any, contract?: string) {
        let account = contract ? contract : actor;

        const api = await this.contract.getAPI()

        return new Promise(async (res) => {
            try {
                const result = await api.transact({
                    actions: [{
                        account,
                        name: action,
                        authorization: [{
                            actor: actor,
                            permission: 'active'
                        }],
                        data: data
                    }]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 3600,
                })

                res(result);
            } catch (e) {
                res(e);
            }
        })
    }

    async pushTransactions(options: TransactionOptions | TransactionOptions[]) {
        const api = await this.contract.getAPI()

        return new Promise(async (res) => {
            // console.log(options);
            let actions = [];

            if (Array.isArray(options)) {
                let key = options[0].auth_key;
                if (options.length == options.filter(t => t.auth_key == key).length) {
                    for (let option of options) {
                        let {
                            name,
                            data,
                            acct,
                            permission
                        } = option;

                        let {
                            type,
                            actor
                        } = permission;

                        actions.push({
                            account: acct,
                            name: name,
                            authorization: [{
                                actor: actor,
                                permission: type
                            }],
                            data: data
                        })
                    }
                } else {
                    res(JSON.stringify({
                        error: {
                            details: [
                                {
                                    message: 'Transactions must have same auth keys'
                                }
                            ]
                        }
                    }))
                }
            } else {
                let {
                    name,
                    data,
                    acct,
                    auth_key,
                    permission
                } = options;

                let {
                    type,
                    actor
                } = permission;

                actions.push({
                    account: acct,
                    name: name,
                    authorization: [{
                        actor: actor,
                        permission: type
                    }],
                    data: data
                })
            }

            try {
                const result = await api.transact(
                    { actions }, 
                    {
                        blocksBehind: 5,
                        expireSeconds: 3600,
                    }
                );
                // console.log(result);
                res(result);
            } catch (e) {
                console.log('\nCaught exception on transact: ' + e);
                if (e instanceof RpcError)
                    res(JSON.stringify(e, null, 2));
                else res(JSON.stringify(e))
            }
        })
    }

    getRows(options: GetRowOptions, contract: string): Promise<GetRowData> {
        let rpc: JsonRpc = new JsonRpc(this.API_ENDPOINT, { fetch });

        return new Promise(async (res, rej) => {
            if (!options.scope) options.scope = options.contract;
            try {
                let result: GetRowData = await rpc.get_table_rows({
                    json: true,
                    code: options.contract,
                    scope: options.scope ? options.scope : options.contract,
                    table: options.table,
                    index_position: options.index_position,
                    limit: options.limit,
                    lower_bound: options.lower_bound,
                    upper_bound: options.upper_bound,
                    key_type: options.key_type,
                    reverse: options.reverse
                });
                res(result);
            } catch (e) {
                rej(this.getErrorMessage(e));
            }
        })
    }

    getErrorMessage(err: any) {
        let message = "Error occurred. Please try again later.";
        if (err.message && err.message.indexOf("assertion failure with message: ") > -1) {
            let parts = err.message.split('assertion failure with message: ');
            if (parts.length > 0) {
                let error = parts[1].split("\n");
                message = error[0];
                if (message && message.length > 1) return message[0].toUpperCase() + message.slice(1);
            }
        }
        if (err.json && err.json.message) {
            if (err.json.message == "UnAuthorized") err.json.message = "Provided keys or permissions do not satisfy declared authorizations";
            return "Error: " + err.json.message;
        }
        if (err.message) return "Error: " + err.message;
        return message;
    }

    login(username: string, key: string) {
        return new Promise((resolve, reject) => {
            axios.get(this.HYPERION + `/v2/state/get_account?account=${username}`).then(async (res: any) => {
                let checkKey = false

                for (let key1 of res.data.account.permissions)
                    for (let key2 of key1.required_auth.keys)
                        if (key2.key == key)
                            checkKey = true

                if (checkKey) {
                    // KEY MATCHES
                    this.contract.getRows({
                        table: 'users',
                        upper_bound: username,
                        lower_bound: username,
                        limit: 1
                    })
                    .then((res: any) => {
                        if (res.rows.length > 0) {
                            // USER FOUND
                            let user = res.rows[0]

                            let data = {
                                username,
                                firstName: '',
                                lastName: '',
                                email: '',
                                phone: '',
                                DOB: undefined,
                                currency: 'usd',
                                location: '',
                                profileImgURL: user.profileImgURL,
                            }
                            if (user.data) data = JSON.parse(CryptoJS.AES.decrypt(user.data, this.AES_KEY).toString(CryptoJS.enc.Utf8));

                            if (user.user == username) {
                                // USERNAME MATCHES
                                user.data = data
                                resolve(user)
                            }
                            else reject("Incorrect password, please try again")
                        }
                        else reject("Username not found, please try again")
                    })
                }
                else reject("Incorrect password, please try again")
            }, err => { reject("Username not found, please try again.") })
        })
    }

    verifyLogin(username: string, key: string) {
        return new Promise((resolve, reject) => {
            axios.get(this.HYPERION + `/v2/state/get_account?account=${username}`).then(async (res: any) => {
                let currKey

                for (let key of res.data.account.permissions)
                    if (key.perm_name == 'active')
                        currKey = key.required_auth.keys[0].key

                if (currKey && currKey == key) {
                    // KEY MATCHES
                    this.contract.getRows({
                        table: 'users',
                        upper_bound: username,
                        lower_bound: username,
                        limit: 1
                    })
                    .then((res: any) => {
                        if (res.rows.length > 0) {
                            // USER FOUND
                            let user = res.rows[0]
                            if (user.user == username) {
                                resolve(true)
                            }
                            else reject("Incorrect password, please try again")
                        }
                        else reject("Username not found, please try again")
                    })
                }
                else reject("Incorrect password, please try again")
            }, err => { reject("Username not found, please try again.") })
        })
    }

    updateUser(user: User) {
        return new Promise((resolve, reject) => {
            let data : User = {
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                DOB: user.DOB,
                currency: user.currency,
                location: user.location,
            }

            this.contract.pushTransaction({
                account: 'wire.users',
                name: 'updateuser',
                actor: 'airwire',
                data: {
                    user: user.username,
                    profileImgURL: user.profileImgURL,
                    data: CryptoJS.AES.encrypt(JSON.stringify(data), this.AES_KEY).toString(),
                    key: user.key
                }
            })
            .then((res: any) => {
                // console.log(res);
                if (res.transaction_id) resolve(res)
            }, (err) => { reject(err) })
        })
    }

    updateActiveKey(user: string, key: string) {
        return new Promise((resolve, reject) => {
            this.contract.pushTransaction({
                account: 'eosio',
                name: 'updateauth',
                actor: user,
                permission: 'owner',
                data: {
                    account: user,
                    permission: "active",
                    parent: "owner",
                    auth: {
                        threshold: 1,
                        keys: [{ key, weight: 1 }],
                        accounts: [],
                        waits: []
                    }
                }
            })
            .then((res: any) => {
                console.log("UPDATE KEY SUCCESS", res);
                if (res.transaction_id) {
                    this.addKey(user, key).then((res2: any) => {
                        resolve([res, res2])
                    }, err => { resolve([res, err]) })
                }
            }, (err) => { reject(err) })
        })
    }

    async updateUserAndKey(user: User) {
        const api = await this.contract.getAPI()

        return new Promise(async (resolve, reject) => {
            let data = {
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                DOB: user.DOB,
                currency: user.currency,
                location: user.location,
            }

            try {
                const result = await api.transact({
                    actions: [
                        {
                            account: 'wire.users',
                            name: 'updateuser',
                            authorization,
                            data: {
                                user: user.username,
                                profileImgURL: user.profileImgURL,
                                data: CryptoJS.AES.encrypt(JSON.stringify(data), this.AES_KEY).toString(),
                                key: user.key
                            }
                        },
                        {
                            account: 'eosio',
                            name: 'updateauth',
                            authorization: [{
                                actor: user.username,
                                permission: 'owner',
                            }],
                            data: {
                                account: user.username,
                                permission: "active",
                                parent: "owner",
                                auth: {
                                    threshold: 1,
                                    keys: [{ key: user.key, weight: 1 }],
                                    accounts: [],
                                    waits: []
                                }
                            }
                        }

                    ]
                }, { blocksBehind: 3, expireSeconds: 30 }
                );
                console.log("RESULT", result);
                resolve(result)
            }
            catch (err) {
                console.log("Error on newaccount:", err);
                if (err instanceof RpcError)
                    reject(JSON.stringify(err.json, null, 2));
                else reject(JSON.stringify(err))
            }
        })
    }

    addKey(user: string, key: string) {
        return new Promise((resolve, reject) => {
            this.contract.pushTransaction({
                account: 'wire.users',
                name: 'addkey',
                actor: 'airwire',
                data: { user, key }
            })
                .then((res: any) => {
                    console.log("ADD KEY SUCCESS", res);
                    resolve(res)
                }, (err) => { reject(err) })
        })
    }

    generateKeySeed(username: string, password: string): Promise<Key> {
        let seed = pbkdf2.pbkdf2Sync(password, username, 1, 32, 'sha512').toString('hex')

        return new Promise(async (res) => {
            let key: Key = {
                priv_key: ecc.seedPrivate(seed),
                pub_key: ecc.privateToPublic(ecc.seedPrivate(seed))
            }
            // console.log(key);
            res(key)
        })
    }

    getNonce(username: string, update: boolean = false) : Promise<string> {
        return new Promise(async (resolve, reject) => {
            let now = new Date().getTime();
            let res : any = await this.db.select({ table: 'nonces',  where: `username='${username}'` })

            if (res.length != 0){
                // Nonce exists, update and return
                let user : UserNonce = res[0]

                if(user.expires < now || update) {
                    if (update) this.db.update({
                        table: 'nonces',
                        where: `username = '${username}'`,
                        data: {
                            nonce: now.toString(),
                            expires: now + (1000 * 60 * 5)
                        }
                    }).then(()=>{ resolve(now.toString()); })
                    else reject('nonce expired');
                }
                else { resolve(user.nonce); }
            }
            else {
                // Doen't exist, add and return
                if(update) this.db.insert('nonces', {
                    username,
                    nonce: now.toString(),
                    expires: now + (1000 * 60 * 5)
                }).then(()=>{ resolve(now.toString()); })
                else reject('nonce not found');
            }
        })
    }

    getUserActiveKeys(username : string) : Promise<String[]>{
        return new Promise((resolve, reject)=>{
            axios.get(this.HYPERION + `/v2/state/get_account?account=${username}`).then(async (res: any) => {
                let pub_keys : String[] = []
                for (let key1 of res.data.account.permissions)
                    if (key1.perm_name == 'active')
                        for (let key2 of key1.required_auth.keys)
                            pub_keys.push(key2.key)
                    
                // console.log(pub_keys);
                resolve(pub_keys)
            })
        })
    }

    verifySignature(signature : any, message : any){
        return new Promise((resolve, reject)=>{
            this.getUserActiveKeys(message).then((keys : String[])=>{
                for (let pub_key of keys) try {
                    let verify = ecc.verify(signature, message, pub_key)
                    if (verify === true) resolve(true)
                }
                catch(err){ resolve(false) }
                resolve(false)
            }, err => resolve(err))
        })
    }

    encrypt(value: any): string {
        value = value instanceof String ? value : JSON.stringify(value);
        var encrypted = CryptoJS.AES.encrypt(value, global.config.crypto_js_key, {
            format: this.JsonFormatter, mode: CryptoJS.mode.CBC
        }).toString();
        return encrypted;
    }
    JsonFormatter = {
        stringify: function (cipherParams: any) {
            var jsonObj: any = { ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64) };
            if (cipherParams.iv) {
                jsonObj.iv = cipherParams.iv.toString();
            }
            if (cipherParams.salt) {
                jsonObj.s = cipherParams.salt.toString();
            }
            return JSON.stringify(jsonObj);
        },
        parse: function (jsonStr: string) {
            var jsonObj = JSON.parse(jsonStr);
            // extract ciphertext from json object, and create cipher params object
            var cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
            });
            if (jsonObj.iv) {
                cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
            }
            if (jsonObj.s) {
                cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
            }
            return cipherParams;
        }
    }
    decrypt<T>(value: string): T {
        return CryptoJS.AES.decrypt(value, global.config.crypto_js_key, { format: this.JsonFormatter }).toString(CryptoJS.enc.Utf8);
    }
}

export interface GetRowOptions {
    contract: string;
    scope?: string;
    table: string;
    index_position?: string | number;
    limit?: number;
    lower_bound?: string;
    upper_bound?: string;
    key_type?: string;
    reverse?: boolean;
}
export interface User {
    username: string
    password?: string
    firstName: string
    lastName: string
    email: string
    phone: string
    DOB: Date
    currency: string
    location: string
    address?: string
    key?: string
    keys?: string[]
    profileImgURL?: string
}
interface Keys {
    active: Key,
    owner: Key,
}
interface Key {
    pub_key: string,
    priv_key: string,
    parent?: string
}
export interface TransactionOptions {
    name: string;
    permission: Permission;
    data: any;
    acct: string;
    auth_key?: string;
}
export interface Permission {
    type: string;
    actor: string;
}
interface UserNonce {
    nonce: string;
    expires: number;
}