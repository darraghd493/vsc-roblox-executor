import Packet from "../Packet";
import PacketId from "../PacketId";

class S01AuthenticationResponse extends Packet {
    constructor() {
        super(PacketId.SERVER_AUTHENTICATION_RESPONSE);
    }

    public static deserialise(data: string): S01AuthenticationResponse {
        const obj = JSON.parse(data);
        const packet = new S01AuthenticationResponse();
        packet.id = obj.id;
        return packet;
    }
}

export default S01AuthenticationResponse;