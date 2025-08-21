#!/usr/bin/env node

// Import Node built-in modules
import * as fs from 'node:fs';
import * as path from 'node:path';

// Import third-party modules
import { parseStringPromise } from 'xml2js';
import TurndownService from 'turndown';
import * as yaml from 'js-yaml';

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
  try {
    // Define the output directory
    const outputDir = path.join(path.dirname(xmlFilePath), 'markdown-posts');

    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      // Use recursive true to handle any nested paths safely, though our sanitizing should prevent this.
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read the XML file
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8');

    // Parse the XML data into a JavaScript object
    const result = await parseStringPromise(xmlData);
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

  } catch (error) {
    console.error('An error occurred:', error);
  }
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
