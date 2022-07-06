import { JsonRpc, RpcError, Api } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { TextDecoder, TextEncoder } from 'text-encoding';
import sha256 from "crypto-js/sha256";
import axios from 'axios';

const ecc = require('eosjs-ecc'); 
const fetch = require('node-fetch');

const endpoints = [
    'https://swamprod.airwire.io',
    'https://wire.siliconswamp.info',
    'https://londonprod.airwire.io',
    'https://tokyoprod.airwire.io',
    'https://sydneyprod.airwire.io',
    'https://fremontprod.airwire.io',
]

export class Contract {
    private AIRWIRE_ACTIVE_PRIVATE
    private endpoint : string = "https://swamprod.airwire.io";

    private cached_public_keys: CachedKeys = {};

    constructor(){
        let { AIRWIRE_ACTIVE_PRIVATE } = global.config.dev ? global.config.hosts.development : global.config.hosts.production
        this.AIRWIRE_ACTIVE_PRIVATE = AIRWIRE_ACTIVE_PRIVATE;
        this.findEndpoint().then((endpoint) => { this.endpoint = endpoint; });
    }

    getRows<T>(options : any): Promise<GetRow<T>>
    getRows(options: any): Promise<GetRowData>
    getRows(options : any) {
        let rpc : JsonRpc = new JsonRpc(this.endpoint, { fetch });

        return new Promise(async (res, rej) => {
            let defaults : any = {
                scope: "wire.users", 
                contract: "wire.users", 
                limit: 9999, 
                index: 1,
                reverse: false
            };
            ['scope', 'contract', 'limit', 'index', 'reverse'].forEach((key : any) => {
                if (!options.hasOwnProperty(key)) options[key] = defaults[key]}
            );     
                  
            try {
                let result : GetRowData = await rpc.get_table_rows({
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
                // console.log(result);
                res(result);
            } catch (e) {
                console.log('\nCaught exception on get_table_rows: ', e);
                if (e instanceof RpcError) rej(JSON.stringify(e.json, null, 2));
            }
        })
    }

    pushTransaction(options: TransactionOptions): Promise<any>{
        return new Promise(async (res, rej) => {
            
            let { account, name, actor, data, permission  } = options;

            let actions : any = [{
                account: account,
                name: name,
                authorization: [{
                    actor: actor,
                    permission: permission ? permission : 'active'
                }],
                data: data
            }]
            
            try {
                const result = await this.getAPI().transact(
                    { actions }, 
                    { blocksBehind: 3, expireSeconds: 3600 }
                );

                // console.log(result);
                res(result);
            } catch (e) {
                console.log('\nCaught exception on transact: ' + e, options);
                if (e instanceof RpcError)
                    rej(JSON.stringify(e, null, 2));
                else rej(JSON.stringify(e))
            }
        })
    }

    pushTransactions(options: TransactionOptions | TransactionOptions[]){
        return new Promise(async (res, rej) => {
            let actions = []

            if(Array.isArray(options)) {
                for(let option of options) {
                    let { account, name, actor, data, permission  } = option;
                    actions.push({
                        account: account ? account : 'wire.nft',
                        name: name,
                        authorization: [{
                            actor: actor,
                            permission: permission ? permission : 'active'
                        }],
                        data: data
                    })
                }
            } else {
                let { account, name, actor, data, permission  } = options;
                actions.push({
                    account: account ? account : 'wire.nft',
                    name: name,
                    authorization: [{
                        actor: actor,
                        permission: permission ? permission : 'active'
                    }],
                    data: data
                })
            }
            
            try {
                const result = await this.getAPI().transact(
                    { actions }, 
                    { blocksBehind: 3, expireSeconds: 3600 }
                );

                // console.log(result);
                res(result);
            } catch (e) {
                console.log('\nCaught exception on transact: ' + e, options);
                if (e instanceof RpcError)
                    rej(JSON.stringify(e, null, 2));
                else rej(JSON.stringify(e))
            }
        })
    }

    getTableScopes(options: GetTableScopesOptions): Promise<TableScopes> {
        return new Promise((resolve, reject) => {
            let [api, rpc] = this.getAPI_RPC();

            rpc.get_table_by_scope(options).then((result : any) => {
                resolve(result);
            }).catch((err : any) => {
                reject(err);
            })
        })
    }

    getAPI_RPC(key? : string): [Api, JsonRpc] {
        let signatureProvider : JsSignatureProvider = new JsSignatureProvider([ key ? key : this.AIRWIRE_ACTIVE_PRIVATE ]);
        let rpc : JsonRpc = new JsonRpc(this.endpoint, { fetch });
        let api = new Api({rpc, signatureProvider, textDecoder : new TextDecoder(), textEncoder : new TextEncoder()});
        return [api, rpc];
    }

    getAPI(key? : string){
        let signatureProvider : JsSignatureProvider = new JsSignatureProvider([ key ? key : this.AIRWIRE_ACTIVE_PRIVATE ]);
        let rpc : JsonRpc = new JsonRpc(this.endpoint, { fetch });
        let api = new Api({rpc, signatureProvider, textDecoder : new TextDecoder(), textEncoder : new TextEncoder()});
        return api
    }

    get_publicKey(username: string): Promise<string | string[]> {
        return new Promise(async (resolve, reject) => {
            let now = new Date().getTime();
            if(this.cached_public_keys[username]) {
                return resolve(this.cached_public_keys[username].key)
            } else {
                let [api, rpc] = this.getAPI_RPC();
                let account = await rpc.get_account(username).catch((err: any ) => {
                    console.log("Error:",err);
                    reject("Account not found.");
                });
                
                if (account) {
                    let permission = account.permissions.filter((p : any)=> p.perm_name == 'active')[0];
                    if (permission) {
                        let key = permission.required_auth.keys.length > 1 ? permission.required_auth.keys.map(w => w.key) : permission.required_auth.keys[0].key;
                        if (key) {
                            this.cached_public_keys[username] = {
                                key,
                                expires: now + 3600000
                            };
                            resolve(key);
                        } else {
                            reject("No key found.");
                        }
                    } else {
                        reject("Active permission not found for account " + username);
                    }
                    console.log("Account:",account);
                }
            }

            for(let [user, key] of Object.entries(this.cached_public_keys).filter(([u, k]) => { return k.expires <= now })) {
                delete this.cached_public_keys[user];
            }
        })
    }

    findEndpoint(): Promise<string> {
        if (global.foundEndpoint && global.foundEndpoint.promise) return global.foundEndpoint.promise;
        else {
            let prom = new Promise<string>((resolve, reject) => {
                let proms: Array<Promise<PingResponse>> = []
                for(let ep of endpoints) {
                    proms.push(new Promise((resolve) => {
                        let start = new Date().getTime();
                        let url = ep + '/v1/chain/get_info';
                        axios.get(url).then((response) => {
                            let end = new Date().getTime();
                            let ms = end - start;
                            resolve({
                                ms,
                                endpoint: ep
                            })
                        }).catch((err) => {
                            console.log('Error getting info');
                            resolve({
                                ms: undefined,
                                endpoint: ep
                            });
                        })
                    }))
                }
                // console.log(proms);

                Promise.all(proms).then((pings) => {
                    let successful = pings.filter(p => p.ms != undefined);
                    if(successful.length) {
                        let sorted = successful.sort((a, b) => {return  a.ms && b.ms ? a.ms > b.ms ? 1 : b.ms > a.ms ? -1 : 0 : 0 });
                        // console.log(sorted);
                        resolve(sorted[0].endpoint);
                    } else {
                        resolve(this.endpoint);
                    }
                })
            })
            global.foundEndpoint = {
                promise: prom
            }
            return prom;
        }
    }

    async verifyBody(body: any, signature: string, username: string): Promise<boolean> {
        // console.log('Verify');

        let str: string = '';
        try {
            str = JSON.stringify(body)
        } catch(err) {
            console.log('Body not JSON');
            if(typeof body == 'string') str = body;
        }
        
        let hashedUsername: string = sha256(str).toString();
        // console.log('Hash', hashedUsername);
        

        let key = await this.get_publicKey(username).catch((err : any) => {
            console.log('Error getting KEY');
        });

        if(key) {
            console.log('Public Key', key);
            if(Array.isArray(key)) {
                console.log('Keys', key);
                
                for(let k of key) {
                    let auth = ecc.verifyHash(signature, hashedUsername, k);
                    if(auth) return auth;
                }
                return false;
            } else {
                console.log('Just One', key);
                
                return ecc.verifyHash(signature, hashedUsername, key);
            }
        }

        return false;
    }

    addToGroup(username: string, groupsToAdd : string[]){
        return new Promise(async (resolve, reject) => {
            let actions : PushTransactionOptions[] = []
            if (groupsToAdd.length){
                for (let group of groupsToAdd) actions.push({
                    account: 'wire.users',
                    name: 'gadduser',
                    authorization: [{
                        actor: 'dragonspawn',
                        permission: 'owner',
                    }],
                    data: {
                        editor: 'dragonspawn',
                        group,
                        user: username,
                        permission: 0
                    }
                })
                const result = await this.getAPI().transact({ actions }, { blocksBehind: 3, expireSeconds: 30 });
                resolve(result)
            }
            else reject('No groups to add')
        })
    }
}

export interface CachedKeys {
    [key:string] : {
        key: string | string[];
        expires: number;
    }
}

export interface GetRow<T> {
    rows : T[],
    more : boolean,
    next_key : string
}

export interface GetRowData {
    rows : any[],
    more : boolean,
    next_key : string
}

export interface TransactionOptions {
    account?: string;
    name: string;
    actor: string;
    authorization? : TransactionAuth[]
    data: any;
    permission?: string
}

export interface TableScopes {
    rows: TableScopeRow[];
    more: string;
}

interface GetTableScopesOptions {
    code: string;
    table: string;
    lower_bound?: string;
    upper_bound?: string;
    reverse?: boolean;
}

interface TableScopeRow {
    code: string;
    scope: string;
    table: string;
    payer: string;
    count: number;
}

interface PingResponse {
    ms?: number;
    endpoint: string;
}

export interface WireChainUser {
    user: string;
    eth_address?: string;
    nonce: number;
    verified: number;
    metamask_user: boolean;
    added: string | Date;
    modified: string | Date;
}

export interface TransactionAuth {
    actor: string;
    permission: string;
}

export interface PushTransactionOptions {
    account: string,
    name: string,
    authorization : TransactionAuth[],
    data: {}
}