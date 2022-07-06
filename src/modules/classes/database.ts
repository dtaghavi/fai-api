const mysql = require('mysql');
// console.log(global.config);

export class DataBase {
    connected = false;
    con: any;

    constructor() { 
        // Uncomment to initialize SQL database connection:
        // this.con = mysql.createConnection(global.config.database); 
    }

    query(sql: string){
        return new Promise((res, rej)=>{
            this.Connect().then(()=>{
                this.con.query(sql, (err: any, result: any)=>{
                    if(err) rej(err);
                    res(result);
                }, (err : any) => { rej(err) })
            }, err => { rej(err) })
        })
    }

    getRow(sql: string) {
        return new Promise((res, rej) => {
            this.query(sql).then((result: any) => {
                if (result.length == 0) res([])
                else res(result[0]);
            }, err => { rej(err) })
        })
    }

    select(options: SelectOptions){
        return new Promise((res, rej)=>{
            if(!options.table) rej({error: 'No Table defined'});
            let sql = `SELECT ${options.columns ? options.columns.join(',') : '*'} FROM ${options.table} ${(options.where ? 'WHERE ' + [options.where].join(' ') : '')}`;
            this.Connect().then((err)=>{
                if(err) rej(err);
                this.con.query(sql, (err: any, result: any)=>{
                    if(err) rej(err);
                    res(result);
                }, (err : any) => { rej(err) })
            })
        })
    }
    
    update(options: DatabaseUpdate) {
        return new Promise((res, rej) => {
            if(options.table && options.data && options.where && (Array.isArray(options.where) || typeof options.where == 'string')) {
                new Promise((next) => {
                    let set = 'SET ';
                    let keys = Object.keys(options.data);
                    keys.forEach((key : string, i) => {
                        let val = options.data[key];
                        if(typeof val == 'boolean') val = val ? 1 : 0;
    
                        if (i == keys.length - 1) {
                            if(val == null) set += ` ${key} = ${val}`;
                            else            set += ` ${key} = '${val}'`;
                            next(set);
                        } 
                        else {
                            if (val == null) set += ` ${key} = ${val},`;
                            else             set += ` ${key} = '${val}',`;
                        }
                    })
                }).then((set) => {
                    let where = Array.isArray(options.where) ? options.where.join(' ') : options.where;
                    let sql = `UPDATE ${options.table} ${set} WHERE ${where}`;

                    this.Connect().then(()=>{
                        this.con.query(sql, (err: any, result: any)=>{
                            if(err) rej(err);
                            res(result);
                        }, (err : any) => { rej(err) })
                    }, (err : any) => { rej(err) })
                })
            } else rej({error: 'missing options {table: String, data: Object, where: String[] }'});
        })
    }
    
    insert(table: string, data: Object) {
        // added this to handle null values not being turned into empty strings
        let values = '';
        Object.values(data).forEach((value : any, index : any) => {
            if (index != Object.values(data).length - 1) {
                if (value == null) values += "" + null + ",";
                else               values += "'" + value + "',";
            }
            else if (index == Object.values(data).length - 1) {
                if (value == null) values += "" + null;
                else               values += "'" + value + "'";
            }
        });
        return new Promise((res, rej) => {
            this.query(`INSERT INTO ${table} (${Object.keys(data).map(k => table + '.' + k).join(',')}) VALUES (${"" + values + ""})`).then((result: any) => {
                res(result);
            }, (err : any) => { rej(err) })
        })
    }
    
    loadData(table: string, data: any) {
        return new Promise((res, rej) => {
            this.query(`SELECT * from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME='${table}'`).then((columns: any) => {
                if(data) {
                    let returnData: any = {};
                    columns.forEach((column: any, i: number) => {
                        let col_name = column.COLUMN_NAME

                        if (data[col_name])          returnData[col_name] = data[col_name];
                        else if (column.IS_NULLABLE) returnData[col_name] = null;
    
                        if (columns.length - 1 == i) res(returnData);
                    });
                } else rej(false);
            })
        })
    }

    Connect(){
        return new Promise((res, rej)=>{
            if (this.connected) res(true);
            else try {
                this.con.connect((err: any)=>{
                    if(err) rej(err);
                    else {
                        this.connected = true;
                        res(true);
                    }
                })
            } catch (e) { rej(e) }
        })
    }
}

export interface DatabaseUpdate {
    table: string;
    data: any;
    where: string[] | string;
}

interface SelectOptions {
    table: string;
    columns?: string[];
    where?: string[] | string;
}