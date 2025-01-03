import Packet from "../Packet";
import PacketId from "../PacketId";

class S03Error extends Packet {
    public errorId: number = 0;

    constructor(errorId: number) {
        super(PacketId.SERVER_ERROR);
        this.errorId = errorId;
    }

    public static deserialise(data: string): S03Error {
        const obj = JSON.parse(data);
        const packet = new S03Error(obj.errorId);
        packet.id = obj.id;
        return packet;
    }
}

enum ErrorId {
    AUTHENTICATION_REQUIRED = 0x00000001,
    INVALID_PACKET = 0x00000002,
}

export default S03Error;
export {
    ErrorId,
};