import Packet from "../Packet";
import PacketId from "../PacketId";

class C03Output extends Packet {
    public message: string;
    public type: number;

    constructor(message: string, type: number) {
        super(PacketId.CLIENT_OUTPUT);
        this.message = message;
        this.type = type;
    }

    public static deserialise(data: string): C03Output {
        const obj = JSON.parse(data);
        const packet = new C03Output(obj.message, obj.type);
        packet.id = obj.id;
        return packet;
    }
}

enum OutputId {
    PRINT = 0x00000001,
    WARNING = 0x00000002,
    ERROR = 0x00000003,
}

export default C03Output;
export {
    OutputId
};