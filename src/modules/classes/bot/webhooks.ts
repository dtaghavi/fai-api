import { Subject } from 'rxjs';

export class WebHooks {
    hooks: { [key: string]: Array<Subject<any>> } = {}

    on<T>(event: string): Subject<T> {
        let subject = new Subject<T>();
        if(this.hooks[event]) {
            this.hooks[event].push(subject)
        } else {
            this.hooks[event] = [subject];
        }
        return subject;
    }

    emit<T>(event: string, data: T) {
        if(this.hooks[event]) this.hooks[event].forEach(s => s.next(data));
    }
}