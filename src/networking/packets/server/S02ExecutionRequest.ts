import { createHash } from "crypto";

import Packet from "../Packet";
import PacketId from "../PacketId";

class S02ExecutionRequest extends Packet {
    public scriptContents: string;
    public validationHash: string;
    public executionId: number;

    constructor(scriptContents: string, executionId: number) {
        super(PacketId.SERVER_EXECTUION_REQUEST);
        this.scriptContents = scriptContents;
        this.validationHash = createHash('sha256')
            .update(this.scriptContents)
            .digest('hex');
        this.executionId = executionId;
    }

    public static deserialise(data: string): S02ExecutionRequest {
        const obj = JSON.parse(data);
        const packet = new S02ExecutionRequest(obj.scriptContents, obj.executionId);
        packet.id = obj.id;
        return packet;
    }
}

export default S02ExecutionRequest;