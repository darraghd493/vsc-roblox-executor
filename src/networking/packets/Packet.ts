class Packet {
    public id: number;

    constructor(id: number) {
        this.id = id;
    }

    public serialise(): string {
        return JSON.stringify(this);
    }

    public static deserialise(data: string): Packet {
        return JSON.parse(data) as Packet;
    }
}

export default Packet;