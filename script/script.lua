--[[
    vsc-roblox-executor - Script
    Handles the client-side execution of scripts.
]]

local CONFIG = {
    SERVER_URL = "ws://localhost:8080";
    DEBUG = false;
}

--// UTILS //
local function fetch(url: string)
    return request({
        Url = url;
        Method = "GET";
    }).Body
end

local function format(...)
    if type(...) == "string" then return ... end
    if type(...) == "number" then return tostring(...) end
    if type(...) == "table" then return table.concat(..., " ") end
    if type(...) == "boolean" then return tostring(...) end
    if type(...) == "function" then return tostring(...) end
    if type(...) == "userdata" then return tostring(...) end
    if type(...) == "thread" then return tostring(...) end
    if type(...) == "nil" then return "nil" end
    return ""
end

--// CONSTANTS //
local Logger = loadstring(fetch("https://pastebin.com/raw/MWsAEADZ"))()

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local LocalPlayer = Players.LocalPlayer

--// ENUMS //
local PACKET_ID = { -- -1 adjustment to match Node.js packet IDs
    -- Client Packets
    CLIENT_AUTHENTICATION_REQUEST = 0x00000001;
    CLIENT_EXECUTION_STATE = 0x00000002;
    CLIENT_OUTPUT = 0x00000003;

    -- Server Packets
    SERVER_AUTHENTICATION_RESPONSE = 0x10000001;
    SERVER_EXECTUION_REQUEST = 0x10000002;
    SERVER_ERROR = 0x10000003;
}

local EXECUTION_STATE_ID = {
    SUCCESSFUL = 0x00000001;
    ERROR = 0x00000002;
    INVALID = 0x00000003;
}

local OUTPUT_TYPE_ID = {
    PRINT = 0x00000001;
    WARNING = 0x00000002;
    ERROR = 0x00000003;
}

local ERROR_ID = {
    AUTHENTICATION_REQUIRED = 0x00000001;
    INVALID_PACKET = 0x00000002;
}
ERROR_ID.__index = ERROR_ID
ERROR_ID.__tostring = function(self)
    if self == ERROR_ID.AUTHENTICATION_REQUIRED then
        return "Authentication Required"
    elseif self == ERROR_ID.INVALID_PACKET then
        return "Invalid Packet"
    end
end

--// PACKET //
--[[
    Note:
    Packets are handled in a generic way, so the data is stored in a table.
    This contrasts the packet structure in the extension, but operates in a much easier way.
]]
local Packet = {
    id = 0x00000000;
    data = {};
}
Packet.__index = Packet

function Packet:new(id, data)
    local packet = {}
    setmetatable(packet, {__index = Packet})
    packet.id = id
    packet.data = data
    return packet
end

function Packet:serialise()
    local packet = {
        ["id"] = self.id
    }
    for i, v in pairs(self.data) do
        packet[i] = v
    end
    return HttpService:JSONEncode(packet)
end

function Packet:deserialise(serialised)
    local packet = HttpService:JSONDecode(serialised)
    self.id = packet.id
    for i, v in pairs(packet) do
        if i ~= "id" then
            self.data[i] = v
        end
    end
end

--// CLIENT //
local Client = {
    connection = nil;
    logger = Logger.new("vsc-roblox-executor", nil, nil, CONFIG.DEBUG and Logger.levels.DEBUG or Logger.levels.INFO);

    -- Data
    authenticated = false;
}
Client.__index = Client

function Client.new()
    local client = {}
    setmetatable(client, {__index = Client})
    return client
end

function Client:disconnect()
    if self.connection then
        self.connection:close()
        self.logger:info("Disconnected from the script server.")
    end
end

function Client:send(packet)
    if self.connection then
        self.connection:Send(packet:serialise())
    end
end

function Client:connect()
    self.connection = WebSocket.connect(CONFIG.SERVER_URL)
    self.logger:debug("Listening for packets...")

    self.connection.OnMessage:Connect(function(message)
        local packet = Packet:new()
        packet:deserialise(message)

        -- Authentication
        if not self.authenticated then
            if packet.id ~= PACKET_ID.SERVER_AUTHENTICATION_RESPONSE then
                self.logger:error("Authentication is required.")
            else
                self.authenticated = true
                self.logger:info("Authenticated with the script server.")
            end
            return
        end

        -- Execution
        if packet.id == PACKET_ID.SERVER_EXECTUION_REQUEST then
            local scriptContents = packet.data.scriptContents
            local validationHash = packet.data.validationHash
            local executionId = packet.data.executionId

            if crypt.hash(scriptContents, "sha256") ~= validationHash then  
                self.logger:error("Validation hash mismatch.")
                self:send(Packet:new(PACKET_ID.CLIENT_EXECUTION_STATE, {
                    ["state"] = EXECUTION_STATE_ID.INVALID;
                    ["message"] = "Validation hash mismatch.";
                    ["executionId"] = executionId;
                }))
            end
            self.logger:debug("Executing script with execution ID: " .. executionId)

            local success, err = loadstring(scriptContents)
            if err then
                self.logger:error("Failed to execute script: " .. err)
                self:send(Packet:new(PACKET_ID.CLIENT_EXECUTION_STATE, {
                    ["state"] = EXECUTION_STATE_ID.ERROR;
                    ["message"] = "";
                    ["executionId"] = executionId;
                }))
                return
            end

            success()
            
            self:send(Packet:new(PACKET_ID.CLIENT_EXECUTION_STATE, {
                ["state"] = EXECUTION_STATE_ID.SUCCESSFUL;
                ["message"] = "";
                ["executionId"] = executionId;
            }))
        end
        
        -- Output
        if packet.id == PACKET_ID.SERVER_ERROR then
            for i, v in pairs(ERROR_ID) do
                if packet.data.errorId == v then
                    self.logger:error("Server error: " .. i)
                    return
                end
            end
        end
    end)

    self:send(Packet:new(PACKET_ID.CLIENT_AUTHENTICATION_REQUEST, {
        ["username"] = LocalPlayer.Name,
        ["userId"] = LocalPlayer.UserId
    }))
    self.logger:info("Sent authentication request to the script server.")

    self.connection.OnClose:Connect(function()
        self.logger:info("Disconnected from the script server.")
    end)
end

--// MAIN //
local client = Client.new()
client:connect()

--// OUTPUT //
local old = {
    print = print;
    warn = warn;
    error = error;
}

print = function(...)
    old.print(...)
    client:send(Packet:new(PACKET_ID.CLIENT_OUTPUT, {
        ["type"] = OUTPUT_TYPE_ID.PRINT;
        ["message"] = format(...);
    }))
end

warn = function(...)
    old.warn(...)
    client:send(Packet:new(PACKET_ID.CLIENT_OUTPUT, {
        ["type"] = OUTPUT_TYPE_ID.WARNING;
        ["message"] = format(...);
    }))
end

error = function(...)
    old.error(...)
    client:send(Packet:new(PACKET_ID.CLIENT_OUTPUT, {
        ["type"] = OUTPUT_TYPE_ID.ERROR;
        ["message"] = format(...);
    }))
end
