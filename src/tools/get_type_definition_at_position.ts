import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { z  } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const ParamsSchemaObject = {
  filePath: z.string().describe('An absolute file path which contains the symbol that you want to get the type definition'),
  line: z.number().describe('A line number of the file which points to the line that symbol is at'),
  column: z.number().describe('A column number of the file which points to the column that symbol is at'),
};
const ParamsSchema = z.object(ParamsSchemaObject);

export const getTypeDefinitionAtPosition = async (params: z.infer<typeof ParamsSchema>): Promise<CallToolResult> => {
  const fileName = path.resolve(params.filePath);
  const fileContent = fs.readFileSync(fileName, 'utf8');

  // Find tsconfig.json
  const configFilePath = ts.findConfigFile(
    path.dirname(fileName),
    ts.sys.fileExists,
    'tsconfig.json'
  );

  if (!configFilePath) {
    throw new Error('tsconfig file was not found');
  }

  // Read and parse tsconfig
  const configFileContent = fs.readFileSync(configFilePath, 'utf-8');
  const parsedConfig = ts.parseJsonSourceFileConfigFileContent(
    ts.parseJsonText(configFilePath, configFileContent),
    ts.sys,
    path.dirname(configFilePath)
  );

  // Create program
  const program = ts.createProgram({
    rootNames: [fileName],
    options: parsedConfig.options,
  });

  // Get source file and type checker
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    throw new Error(`Could not find source file: ${fileName}`);
  }

  const typeChecker = program.getTypeChecker();

  // Calculate position
  const position = sourceFile.getPositionOfLineAndCharacter(params.line - 1, params.column - 1);

  // Find node at position
  function findNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
      if (position >= node.getStart(sourceFile) && position < node.getEnd()) {
        return ts.forEachChild(node, find) || node;
      }
    }
    return find(sourceFile);
  }

  const node = findNodeAtPosition(sourceFile, position);
  if (!node) {
    return {
      content: [{
        type: 'text',
        text: 'No node found at this position'
      }],
      typeInfo: 'No node found at this position',
      symbolDetails: null,
      typeDetails: null,
    };
  }

  const symbol = typeChecker.getSymbolAtLocation(node);
  if (!symbol) {
    return {
      content: [{
        type: 'text',
        text: 'No symbol found at this position'
      }],
      typeInfo: 'No symbol found at this position',
      symbolDetails: null,
      typeDetails: null,
    };
  }

  // Get type of the symbol
  const type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);

  // Detailed type information
  const typeInfo = typeChecker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);

  // Symbol details
  const symbolDetails = {
    name: symbol.getName(),
    escapedName: symbol.getEscapedName().toString(),
    fullName: typeChecker.symbolToString(symbol),
    flags: Object.keys(ts.SymbolFlags).filter((key) => {
      const flagValue = Number(ts.SymbolFlags[key as keyof typeof ts.SymbolFlags]);
      return !isNaN(flagValue) && (symbol.flags & flagValue) !== 0;
    }),
  };

  // Type guard for union type
  function isUnionType(type: ts.Type): type is ts.UnionType {
    return (type as any).types !== undefined && Array.isArray((type as any).types);
  }

  // Type guard for intersection type
  function isIntersectionType(type: ts.Type): type is ts.IntersectionType {
    return (type as any).types !== undefined && Array.isArray((type as any).types);
  }

  // Detailed type details
  const typeDetails = {
    typeParameters: (() => {
      // Handle union types
      if (isUnionType(type)) {
        return (type as any).types.map((tp: ts.Type) => typeChecker.typeToString(tp));
      }
      // Handle intersection types
      if (isIntersectionType(type)) {
        return (type as any).types.map((tp: ts.Type) => typeChecker.typeToString(tp));
      }
      return [];
    })(),
    properties: type.getProperties().map((prop) => ({
      name: prop.getName(),
      type: typeChecker.typeToString(typeChecker.getTypeOfSymbolAtLocation(prop, sourceFile)),
    })),
    callSignatures: type.getCallSignatures().map((sig) => ({
      parameters: sig.getParameters().map((param) => ({
        name: param.getName(),
        type: typeChecker.typeToString(typeChecker.getTypeOfSymbolAtLocation(param, sourceFile)),
      })),
      returnType: typeChecker.typeToString(sig.getReturnType()),
    })),
    constructSignatures: type.getConstructSignatures().map((sig) => ({
      parameters: sig.getParameters().map((param) => ({
        name: param.getName(),
        type: typeChecker.typeToString(typeChecker.getTypeOfSymbolAtLocation(param, sourceFile)),
      })),
      returnType: typeChecker.typeToString(sig.getReturnType()),
    })),
  };

  const info = JSON.stringify({ typeInfo, symbolDetails, typeDetails });
  return {
    content: [
      {
        type: 'text',
        text: info,
      },
    ],
  };
};


export const register = (server: McpServer) => {
  server.tool('get_type_definition_at_position', 'Get type typescript type definitions for the symbol at the given line and column', ParamsSchemaObject, getTypeDefinitionAtPosition);
};