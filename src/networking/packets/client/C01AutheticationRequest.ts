import Packet from "../Packet";
import PacketId from "../PacketId";

class C01AuthenticationRequest extends Packet {
    public username: string;
    public userId: number;

    constructor(username: string, userId: number) {
        super(PacketId.CLIENT_AUTHENTICATION_REQUEST);
        this.username = username;
        this.userId = userId;
    }

    public static deserialise(data: string): C01AuthenticationRequest {
        const obj = JSON.parse(data);
        const packet = new C01AuthenticationRequest(obj.username, obj.userId);
        packet.id = obj.id;
        return packet;
    }
}

export default C01AuthenticationRequest;