"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const get_type_definition_at_position_1 = require("./tools/get_type_definition_at_position");
// Create an MCP server
const server = new mcp_js_1.McpServer({
    name: 'ts-mcp-server',
    version: '1.0.0',
});
// Register get_type_definition_at_position tool
(0, get_type_definition_at_position_1.register)(server);
// Start receiving messages on stdin and sending messages on stdout
const transport = new stdio_js_1.StdioServerTransport();
(async () => {
    await server.connect(transport);
})();
