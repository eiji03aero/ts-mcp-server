import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { register as registerGetTypeDefinitionAtPosition } from './tools/get_type_definition_at_position';

// Create an MCP server
const server = new McpServer({
  name: 'ts-mcp-server',
  version: '1.0.0',
});

// Register get_type_definition_at_position tool
registerGetTypeDefinitionAtPosition(server);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();

(async () => {
  await server.connect(transport);
})();
