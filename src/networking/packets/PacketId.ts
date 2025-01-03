enum PacketId {
    // Client
    CLIENT_AUTHENTICATION_REQUEST = 0x00000001,
    CLIENT_EXECUTION_STATE = 0x00000002,
    CLIENT_OUTPUT = 0x00000003, // Console output

    // Server
    SERVER_AUTHENTICATION_RESPONSE = 0x10000001,
    SERVER_EXECTUION_REQUEST = 0x10000002,
    SERVER_ERROR = 0x10000003,
}

export default PacketId;