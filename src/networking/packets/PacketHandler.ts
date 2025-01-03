import Packet from "./Packet";

class PacketHandler {
    private packets: Map<number, Packet> = new Map();

    public register(packet: Packet): void {
        this.packets.set(packet.id, packet);
    }
    
    public handle<T extends Packet>(packet: Packet): T | undefined {
        return this.packets.get(packet.id) as T | undefined;
    }
}

export default PacketHandler;