import { REST } from '@discordjs/rest';
import { Client, GuildMember, Intents, Message, MessageReaction, User }  from 'discord.js';
import { Subject } from 'rxjs';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import qs from 'qs';
import { DataBase } from './database';
import { DiscordMember, DiscordGuildRole } from '../../types/discord';

const claimRoles = [ 'ds.admin', 'ds.genesis' ]

export class Discord {
    db : DataBase
    client: Client;
    // rest: REST;
    ready: boolean = false;

    private events: { [key: string]: Array<Subject<any>> } = {}

    constructor() {
        let { bot_token } = global.config.bot_config;

        this.db = new DataBase();
        // this.rest = new REST({ version: '9' }).setToken(bot_token);
        this.client = new Client({ intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS ] });

        this.client.on('ready', () => {
            console.log('Discord Ready');
            this.ready = true;
            this.emit('ready');
        });

        this.client.on('error', (err) => {
            console.log('DISCORD ERROR', err);
        });

        this.client.login(bot_token);
    }

    fetchAccounts(ids: string) : Promise<DiscordMember>
    fetchAccounts(ids: string[]) : Promise<Array<DiscordMember>>
    fetchAccounts(ids: string | string[]) {
        return new Promise(async (resolve, reject) => {
            try {
                let guilds = await this.client.guilds.fetch();
                let guildRef = guilds.get(global.config.guild_id);

                if(guildRef) {
                    let guild = await guildRef.fetch();
                    let members = await guild.members.fetch();

                    let return_members: DiscordMember[] = [];

                    let fetchMember = async (id: string) : Promise<DiscordMember | undefined> => {
                        let member = await this.client.users.fetch(id);
                        let guild_member = members.get(id);

                        if(member) {
                            console.log(member);

                            let user: DiscordMember = {
                                id,
                                username: member.username,
                                expires: new Date().getTime() + 86400000,
                                in_guild: false
                            }
                            if(member.avatar) user.avatar = member.avatar;
                            if(member.banner) user.banner = member.banner;

                            if(guild_member) {
                                user.in_guild = true;

                                user.roles = guild_member.roles.cache.filter(r => r.name != '@everyone').map((role, id) => {
                                    return {
                                        icon: role.icon,
                                        unicodeEmoji: role.unicodeEmoji,
                                        id,
                                        name: role.name,
                                        color: role.color.toString(16)
                                    } as DiscordGuildRole
                                });
                            }
                            return user;
                        }
                        return;
                    }

                    if(Array.isArray(ids)) {    
                        for(let id of ids) {
                            let member = await fetchMember(id);
                            if(member) {
                                return_members.push(member);
                            }
                        }

                        resolve(return_members);
                    } else if (typeof ids == 'string') {
                        let member = await fetchMember(ids);
                        if(member) {
                            resolve(member);
                        } else {
                            reject('Member not found');
                        }
                    }

                } else {
                    reject('Guild not found');
                }
            }
            catch(err){ reject(err) }
        })
    }

    getUserRoles(user_id: string): Promise<Array<DiscordGuildRole>> {
        return new Promise((resolve, reject) => {
            let fetchDiscordRoles: () => Promise<Array<DiscordGuildRole>> = () => {
                return new Promise((resolve, reject) => {
                    this.client.guilds.fetch().then(async (guilds) => {
                        let guildRef = guilds.get(global.config.guild_id);
                        if(guildRef) {
                            let guild = await guildRef.fetch();
                            let roles = await guild.roles.fetch();
                            let members = await guild.members.fetch();

                            let member = members.get(user_id);
                            if(member) {
                                let roles: DiscordGuildRole[] = member.roles.cache.filter(r => r.name != '@everyone').map((role, id) => {
                                    return {
                                        icon: role.icon,
                                        unicodeEmoji: role.unicodeEmoji,
                                        id,
                                        name: role.name,
                                        color: role.color.toString(16)
                                    } as DiscordGuildRole
                                });
                                resolve(roles);
                            } else {
                                reject('Member not in Guild');
                            }
                        } else {
                            reject('Guild not found');
                        }
                    })
                })
            }
    
            if(this.ready) {
                fetchDiscordRoles().then((roles) => {
                    resolve(roles)
                }).catch((err) => {
                    reject(err);
                })
            }
            else this.on('ready').subscribe(() => {
                fetchDiscordRoles().then((roles: any) => {
                    resolve(roles)
                }).catch((err) => {
                    reject(err);
                })
            })
            
        })
    }

    // Parameters: userIds -> array of user names / ids (ideally ids), roleToGrant -> id of the role to grant.
    async massGrantRole(userIds: string[], roleToGrant: string): Promise<Array<string>> {
        let failedIds: string[] = [];
        if(userIds && roleToGrant) {
            return new Promise((resolve, reject) => {
                let fetchDiscordRoles: () => Promise<any> = () => {
                    return new Promise((resolve, reject) => {
                        this.client.guilds.fetch().then(async (guilds) => {
                            let guildRef = guilds.get(global.config.guild_id);
                            if(guildRef) {
                                let guild = await guildRef.fetch();
                                let roles = await guild.roles.fetch();
                                let members = await guild.members.fetch();
                                
                                for(let user of userIds) {

                                    let found_member: GuildMember | void;

                                    if(user.split('#').length > 1) {
                                        console.log('Name + Disc');
                                        let [username, disc] = user.split('#');
                                        found_member = guild.members.cache.find(m => m.user.username === username && m.user.discriminator == disc);
                                    } else if((/^[0-9]{1,45}$/gm).exec(user)) {
                                        console.log('ID');
                                        found_member = members.get(user);
                                    } else {
                                        console.log('GL');
                                        found_member = guild.members.cache.find(m => m.displayName == user);
                                    }

                                    if(found_member) {
                                        await found_member.roles.add(roleToGrant);
                                        //console.log("🚀 ~ found", found_member)
                                    } else {
                                        failedIds.push(user);
                                        //console.log('NOT Found', user);
                                    }
                                }
                                resolve(true)
                            } else {
                                reject('Guild not found');
                            }
                        })
                    })
                }
        
                if(this.ready) {
                    fetchDiscordRoles().then((res) => {
                        resolve(failedIds)
                    }).catch((err) => {
                        console.log(err);
                    });
                }
                else this.on('ready').subscribe(() => {
                    fetchDiscordRoles().then((res) => {
                        resolve(failedIds)
                    }).catch((err) => {
                        console.log(err);
                    });
                })
            })
        }
        return failedIds;
    }

    on<T>(event: string): Subject<T> {
        let subject = new Subject<T>();
        if(this.events[event]) {
            this.events[event].push(subject)
        } else {
            this.events[event] = [subject];
        }
        return subject;
    }

    emit<T>(event: string, data?: T) {
        if(this.events[event]) this.events[event].forEach(s => s.next(data));
    }


    // ** OLD FUNCTIONS FOR REFERENCE, NEED TO BE UPDATED FOR CURRENT USE ** 

    // addAddressUser(user_id: string, address: string) {
    //     return new Promise(async (resolve, reject) => {
    //         let db: {[key:string]: string[]} | undefined = await fs.readJSON(path.join(global.paths.root, 'new_db.json')).catch((err) => {
    //             console.log('Error laoding DB');
    //             reject('Error loading DB');
    //         });

    //         if(db) {
    //             let addr = address.toLowerCase();

    //             if(db[addr]) {
    //                 if(!db[addr].includes(user_id)) db[addr].push(user_id);
    //             } else {
    //                 db[addr] = [user_id];
    //             }

    //             fs.writeJSON(path.join(global.paths.root, 'new_db.json'), db).then(() => {
    //                 resolve(true);
    //             }).catch((err) => {
    //                 reject('Error Saving DB');
    //             })
    //         }
    //     })
    // }

    // removeAddressUser(user_id: string, address: string) {
    //     return new Promise(async (resolve, reject) => {
    //         let db: {[key:string]: string[]} | undefined = await fs.readJSON(path.join(global.paths.root, 'new_db.json')).catch((err) => {
    //             console.log('Error laoding DB');
    //             reject('Error loading DB');
    //         });

    //         if(db) {
    //             let addr = address.toLowerCase();

    //             if(db[addr] && db[addr].includes(user_id)) {
    //                 db[addr].splice(db[addr].indexOf(user_id), 1);
    //             }

    //             fs.writeJSON(path.join(global.paths.root, 'new_db.json'), db).then(() => {
    //                 resolve(true);
    //             }).catch((err) => {
    //                 reject('Error Saving DB');
    //             })
    //         }
    //     })
    // }

    
    // getAddressMemberIDs(address: string): Promise<Array<string>> {
    //     return new Promise(async (resolve, reject) => {
    //         let db: {[key:string]: string[]} | undefined = await fs.readJSON(path.join(global.paths.root, 'new_db.json')).catch((err) => {
    //             console.log('Error laoding DB');
    //         });
    //         let addr = address.toLowerCase();
    //         if(db && db[addr]) {
    //             resolve(db[addr]);
    //         } else {
    //             reject('Address not found');
    //         }
    //     })
    // }

    // getAddressMembers(address: string): Promise<Array<DiscordMember>> {
    //     return new Promise(async (resolve, reject) => {
    //         let ids = await this.getAddressMemberIDs(address).catch((err) => {
    //             reject('No connected accounts');
    //         });

    //         let fetchAccounts = (ids: string[]) : Promise<Array<DiscordMember>> => {
    //             return new Promise((resolve, reject) => {
    //                 this.client.guilds.fetch().then(async (guilds) => {
    //                     let guildRef = guilds.get(global.config.guild_id);
    //                     if(guildRef) {
    //                         let guild = await guildRef.fetch();
    //                         let members = await guild.members.fetch();

    //                         let return_members: DiscordMember[] = [];
                            

    //                         for(let id of ids) {
    //                             let member = await this.client.users.fetch(id);
    //                             let guild_member = members.get(id);
    //                             if(member) {
    //                                 console.log(member);

    //                                 let user: DiscordMember = {
    //                                     id,
    //                                     username: member.username,
    //                                     expires: new Date().getTime() + 86400000,
    //                                     in_guild: false
    //                                 }
    //                                 if(member.avatar) user.avatar = member.avatar;
    //                                 if(member.banner) user.banner = member.banner;

    //                                 if(guild_member) {
    //                                     user.in_guild = true;

    //                                     user.roles = guild_member.roles.cache.filter(r => r.name != '@everyone').map((role, id) => {
    //                                         return {
    //                                             icon: role.icon,
    //                                             unicodeEmoji: role.unicodeEmoji,
    //                                             id,
    //                                             name: role.name,
    //                                             color: role.color.toString(16)
    //                                         } as DiscordGuildRole
    //                                     });
    //                                 }
    //                                 return_members.push(user);
    //                             }
    //                         }

    //                         resolve(return_members);
    //                     } else {
    //                         reject('Guild not found');
    //                     }
    //                 });
    //             })
    //         }

    //         if(ids) {
    //             console.log(ids);
                
    //             if(this.ready) {
    //                 fetchAccounts(ids).then((members) => {
    //                     resolve(members)
    //                 }).catch((err) => {
    //                     reject(err);
    //                 })
    //             } else this.on('ready').subscribe(() => {
    //                 fetchAccounts(ids!).then((members: any) => {
    //                     resolve(members)
    //                 }).catch((err) => {
    //                     reject(err);
    //                 })
    //             })
    //         }
    //     })
    // }

    
    // registerDiscord(username: string, code : any, address : any){
    //     console.log("Registering discord user:", username);
        
    //     return new Promise(async (resolve, reject)=>{
    //         let authorization_response = await axios.post('https://discord.com/api/oauth2/token', qs.stringify({
    //             client_id: global.config.bot_config.client_id,
    //             client_secret: global.config.bot_config.client_secret,
    //             code,
    //             grant_type: 'authorization_code',
    //             redirect_uri: 'https://app.dragonspawn.com'
    //         }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }})
    //         .catch((err) => {  reject({ error: err.response.data.error_description })  })

    //         if (authorization_response) {
    //             let authorization = authorization_response.data;
    //             let user_response = await axios.get('https://discord.com/api/oauth2/@me', {
    //                 headers: { 'authorization': `${ authorization.token_type } ${ authorization.access_token }` }
    //             }).catch((err) => { reject({ error: err.response.data.error_description }) })

    //             if (user_response) {
    //                 let discord_id = user_response.data.user.id
    //                 let user : DiscordMember | void = await this.fetchAccounts(discord_id).catch((error)=> reject({error}))
                    
    //                 let insertUser : DiscordUserSQL = { username, discord_id, address }
    //                 let added = await this.db.insert('discord_users', insertUser).catch((error)=>{ reject({ error }) })

    //                 if (user && user.roles && user.roles.length){
    //                     let roles : DiscordGuildRole[] = user.roles!.filter((role)=>{ return claimRoles.includes('ds.' + role.name.toLowerCase()) })
    //                     let groupsToAdd : string[] = roles.map((role : DiscordGuildRole)=> 'ds.' + role.name.toLowerCase())
    //                     let addedToGroup = await this.contract.addToGroup(username, groupsToAdd).catch((err)=>{ console.log(err); })
    //                     if (addedToGroup) console.log(username, 'added to group(s):', groupsToAdd.join(', '))
    //                 }
    //                 if (added) resolve({ data: user })
    //             }
    //             else reject({ error: 'User response error' })
    //         }
    //     })
    // }
}