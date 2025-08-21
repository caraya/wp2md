#!/usr/bin/env node

// Import Node built-in modules
import * as fs from 'node:fs';
import * as path from 'node:path';

// Import third-party modules
import { parseStringPromise } from 'xml2js';
import TurndownService from 'turndown';
import * as yaml from 'js-yaml';

// --- Script Configuration ---
// Check for the --debug flag in the command-line arguments
const isDebug = process.argv.includes('--debug');

/**
 * Logs messages to the console only if the --debug flag is present.
 * @param message The message to log.
 * @param data Optional data to log alongside the message.
 */
function logDebug(message: string, data?: any) {
  if (isDebug) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

// Initialize the Turndown service to convert HTML to Markdown
const turndownService = new TurndownService();

/**
 * Converts a string to a sanitized, kebab-cased filename.
 * This is used for creating file-system-friendly filenames from post titles.
 * @param str The string to convert.
 * @returns The kebab-cased string.
 */
const toKebabCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid filename characters with a hyphen
    .replace(/([a-z])([A-Z])/g, '$1-$2') // get all lowercase letters that are near to uppercase letters
    .replace(/[\s_]+/g, '-') // replace all spaces and low dash
    .toLowerCase();
};

/**
 * Main function to process the WordPress XML file.
 * @param xmlFilePath The path to the input WordPress XML file.
 */
async function processWordPressXml(xmlFilePath: string) {
  logDebug(`Starting processing for file: ${xmlFilePath}`);
  try {
    // Define the output directory
    const outputDir = path.join(path.dirname(xmlFilePath), 'markdown-posts');
    logDebug(`Output directory set to: ${outputDir}`);

    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      logDebug('Output directory does not exist. Creating it...');
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read the XML file
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8');
    logDebug('Successfully read XML file.');

    // Parse the XML data into a JavaScript object
    const result = await parseStringPromise(xmlData);
    const posts = result.rss.channel[0].item;
    logDebug(`Found ${posts.length} items in the XML file.`);

    // Process each post
    for (const post of posts) {
      // Skip posts that are not published (e.g., drafts, attachments)
      if (!post['wp:status'] || post['wp:status'][0] !== 'publish') {
        logDebug(`Skipping post with status: ${post['wp:status'] ? post['wp:status'][0] : 'N/A'}`);
        continue;
      }
      
      const title = post.title[0] || 'untitled';
      logDebug(`Processing post: "${title}"`);
      logDebug('Full post object:', post);

      const pubDate = post['wp:post_date_gmt'][0];
      const modifiedDate = post['wp:post_modified_gmt'][0];
      const contentEncoded = post['content:encoded'][0];
      
      // Extract categories
      const categories = post.category ? post.category
        .filter((cat: any) => cat.$.domain === 'category')
        .map((cat: any) => cat._) : [];

      // Extract tags
      const tags = post.category ? post.category
        .filter((cat: any) => cat.$.domain === 'post_tag')
        .map((cat: any) => cat._) : [];

      // Convert HTML content to Markdown
      const markdownContent = turndownService.turndown(contentEncoded);

      // Create YAML metadata object
      const metadata: { [key: string]: any } = {
        title: title,
        date: new Date(pubDate).toISOString(),
      };

      if (modifiedDate && modifiedDate !== pubDate) {
        metadata.updated = new Date(modifiedDate).toISOString();
      }

      if (categories.length > 0) {
        metadata.categories = categories;
      }

      if (tags.length > 0) {
        metadata.tags = tags;
      }
      
      logDebug('Generated metadata:', metadata);

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

  } catch (error) {
    console.error('An error occurred:', error);
    logDebug('Full error object:', error);
  }
}

// --- Script Execution ---

// Find the input file path, ignoring the --debug flag
const inputFile = process.argv.find(arg => !arg.startsWith('--') && arg !== process.argv[1]);


// Check if an input file was provided
if (!inputFile) {
  console.error('Error: Please provide the path to the WordPress XML file as an argument.');
  console.log('Usage: wp2md <path-to-your-xml-file.xml> [--debug]');
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
