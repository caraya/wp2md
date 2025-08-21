#!/usr/bin/env node
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Node built-in modules
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
// Import third-party modules
const xml2js_1 = require("xml2js");
const turndown_1 = __importDefault(require("turndown"));
const yaml = __importStar(require("js-yaml"));
// Initialize the Turndown service to convert HTML to Markdown
const turndownService = new turndown_1.default();
/**
 * Converts a string to kebab-case.
 * This is used for creating file-system-friendly filenames from post titles.
 * @param str The string to convert.
 * @returns The kebab-cased string.
 */
const toKebabCase = (str) => {
    if (!str)
        return '';
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2') // get all lowercase letters that are near to uppercase letters
        .replace(/[\s_]+/g, '-') // replace all spaces and low dash
        .toLowerCase();
};
/**
 * Main function to process the WordPress XML file.
 * @param xmlFilePath The path to the input WordPress XML file.
 */
function processWordPressXml(xmlFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Define the output directory
            const outputDir = path.join(path.dirname(xmlFilePath), 'markdown-posts');
            // Create the output directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }
            // Read the XML file
            const xmlData = fs.readFileSync(xmlFilePath, 'utf-8');
            // Parse the XML data into a JavaScript object
            const result = yield (0, xml2js_1.parseStringPromise)(xmlData);
            const posts = result.rss.channel[0].item;
            // Process each post
            for (const post of posts) {
                // Skip posts that are not published (e.g., drafts, attachments)
                if (!post['wp:status'] || post['wp:status'][0] !== 'publish') {
                    continue;
                }
                const title = post.title[0] || 'untitled';
                const pubDate = post['wp:post_date_gmt'][0];
                const modifiedDate = post['wp:post_modified_gmt'][0];
                const contentEncoded = post['content:encoded'][0];
                // Extract categories (tags)
                const tags = post.category ? post.category
                    .filter((cat) => cat.$.domain === 'post_tag')
                    .map((cat) => cat._) : [];
                // Convert HTML content to Markdown
                const markdownContent = turndownService.turndown(contentEncoded);
                // Create YAML metadata object
                const metadata = {
                    title: title,
                    date: new Date(pubDate).toISOString(),
                };
                if (modifiedDate && modifiedDate !== pubDate) {
                    metadata.updated = new Date(modifiedDate).toISOString();
                }
                if (tags.length > 0) {
                    metadata.tags = tags;
                }
                // Convert metadata object to YAML string
                const yamlMetadata = yaml.dump(metadata);
                // Combine YAML metadata and Markdown content
                const fileContent = `---\n${yamlMetadata}---\n\n${markdownContent}`;
                // Create a kebab-case filename from the title
                const fileName = `${toKebabCase(title)}.md`;
                const filePath = path.join(outputDir, fileName);
                // Write the content to a new Markdown file
                fs.writeFileSync(filePath, fileContent);
                console.log(`Created: ${fileName}`);
            }
            console.log('\nProcessing complete!');
            console.log(`Markdown files have been saved in the '${outputDir}' directory.`);
        }
        catch (error) {
            console.error('An error occurred:', error);
        }
    });
}
// --- Script Execution ---
// Get the input file path from the command-line arguments
const inputFile = process.argv[2];
// Check if an input file was provided
if (!inputFile) {
    console.error('Error: Please provide the path to the WordPress XML file as an argument.');
    console.log('Usage: node dist/index.js <path-to-your-xml-file.xml>');
    process.exit(1); // Exit with an error code
}
// Resolve the absolute path for the input file
const xmlFilePath = path.resolve(inputFile);
// Check if the file exists
if (!fs.existsSync(xmlFilePath)) {
    console.error(`Error: The file "${xmlFilePath}" was not found.`);
    process.exit(1);
}
// Run the main function with the provided file path
processWordPressXml(xmlFilePath);
