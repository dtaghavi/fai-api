import fs from 'fs-extra';
import path from 'path';
export class Users {
    constructor() {

    }

    async getUser(id: string) {
        let userPath = path.join(global.paths.users, id + '.json')

        let user: User | undefined = await fs.readJSON(userPath).catch((err) => {
            console.log('Error loading user');
        });

        if(!user) {
            user = {
                id: id,
                balance: 0
            }
            await fs.writeJSON(userPath, user).catch((err) => {
                console.log('Error saving user data');
            });
        }

        return user;
    }

    async saveUser(user: User) {
        let userPath = path.join(global.paths.users, user.id + '.json')
        await fs.writeJSON(userPath, user).catch((err) => {
            console.log('Error saving user data');
        });
    }
}

export interface User {
    id: string;
    balance: number;
}