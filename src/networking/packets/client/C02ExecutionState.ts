import Packet from "../Packet";
import PacketId from "../PacketId";

class C02ExecutionState extends Packet {
    public state: number;
    public message: string;
    public exectuionId: number;

    constructor(state: number, message: string, exectuionId: number) {
        super(PacketId.CLIENT_EXECUTION_STATE);
        this.state = state;
        this.message = message;
        this.exectuionId = exectuionId;
    }

    public static deserialise(data: string): C02ExecutionState {
        const obj = JSON.parse(data);
        const packet = new C02ExecutionState(obj.state, obj.message, obj.exectuionId);
        packet.id = obj.id;
        return packet;
    }
}

enum ExecutionStateId {
    SUCCESSFUL = 0x00000001,
    ERROR = 0x00000002,
    INVALID = 0x00000003,
}

export default C02ExecutionState;
export {
    ExecutionStateId
};