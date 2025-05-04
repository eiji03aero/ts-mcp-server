"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.getTypeDefinitionAtPosition = exports.ParamsSchemaObject = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const zod_1 = require("zod");
exports.ParamsSchemaObject = {
    filePath: zod_1.z.string().describe('An absolute file path which contains the symbol that you want to get the type definition'),
    line: zod_1.z.number().describe('A line number of the file which points to the line that symbol is at'),
    column: zod_1.z.number().describe('A column number of the file which points to the column that symbol is at'),
};
const ParamsSchema = zod_1.z.object(exports.ParamsSchemaObject);
const getTypeDefinitionAtPosition = async (params) => {
    const fileName = path.resolve(params.filePath);
    const fileContent = fs.readFileSync(fileName, 'utf8');
    // Find tsconfig.json
    const configFilePath = typescript_1.default.findConfigFile(path.dirname(fileName), typescript_1.default.sys.fileExists, 'tsconfig.json');
    if (!configFilePath) {
        throw new Error('tsconfig file was not found');
    }
    // Read and parse tsconfig
    const configFileContent = fs.readFileSync(configFilePath, 'utf-8');
    const parsedConfig = typescript_1.default.parseJsonSourceFileConfigFileContent(typescript_1.default.parseJsonText(configFilePath, configFileContent), typescript_1.default.sys, path.dirname(configFilePath));
    // Create program
    const program = typescript_1.default.createProgram({
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
    function findNodeAtPosition(sourceFile, position) {
        function find(node) {
            if (position >= node.getStart(sourceFile) && position < node.getEnd()) {
                return typescript_1.default.forEachChild(node, find) || node;
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
    const typeInfo = typeChecker.typeToString(type, undefined, typescript_1.default.TypeFormatFlags.NoTruncation);
    // Symbol details
    const symbolDetails = {
        name: symbol.getName(),
        escapedName: symbol.getEscapedName().toString(),
        fullName: typeChecker.symbolToString(symbol),
        flags: Object.keys(typescript_1.default.SymbolFlags).filter((key) => {
            const flagValue = Number(typescript_1.default.SymbolFlags[key]);
            return !isNaN(flagValue) && (symbol.flags & flagValue) !== 0;
        }),
    };
    // Type guard for union type
    function isUnionType(type) {
        return type.types !== undefined && Array.isArray(type.types);
    }
    // Type guard for intersection type
    function isIntersectionType(type) {
        return type.types !== undefined && Array.isArray(type.types);
    }
    // Detailed type details
    const typeDetails = {
        typeParameters: (() => {
            // Handle union types
            if (isUnionType(type)) {
                return type.types.map((tp) => typeChecker.typeToString(tp));
            }
            // Handle intersection types
            if (isIntersectionType(type)) {
                return type.types.map((tp) => typeChecker.typeToString(tp));
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
exports.getTypeDefinitionAtPosition = getTypeDefinitionAtPosition;
const register = (server) => {
    server.tool('get_type_definition_at_position', 'Get type typescript type definitions for the symbol at the given line and column', exports.ParamsSchemaObject, exports.getTypeDefinitionAtPosition);
};
exports.register = register;
