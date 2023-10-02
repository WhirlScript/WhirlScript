export default class Deque<T> {
    private data: T[];

    constructor() {
        this.data = [];
    }

    pushFront(item: T): void {
        this.data.unshift(item);
    }

    pushRear(item: T): void {
        this.data.push(item);
    }

    popFront(): T {
        if (this.data.length > 0) {
            return <T>this.data.shift();
        }
        throw new Error("Pop from an empty deque");
    }

    popRear(): T {
        if (this.data.length > 0) {
            return <T>this.data.pop();
        }
        throw new Error("Pop from an empty deque");
    }

    peekFront(): T {
        if (this.data.length > 0) {
            return <T>this.data[0];
        }
        throw new Error("Peek from an empty deque");
    }

    peekRear(): T | undefined {
        if (this.data.length > 0) {
            return <T>this.data[this.data.length - 1];
        }
        throw new Error("Peek from an empty deque");
    }

    isEmpty(): boolean {
        return this.data.length === 0;
    }

    size(): number {
        return this.data.length;
    }

    clear(): void {
        this.data = [];
    }
}