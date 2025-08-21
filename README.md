# WordPress to Markdown Converter (wp2md)

A simple command-line tool to convert a WordPress XML export file into individual Markdown files. Each post is saved as a separate .md file with YAML front matter for metadata like title, date, and tags.

## Features

* Parses WordPress eXtended RSS (WXR) files.
* Converts post content from HTML to Markdown.
* Creates a separate .md file for each published post.
* Adds YAML front matter for post metadata (title, publication date, last updated date, tags).
* Sanitizes post titles to create safe, kebab-case filenames.

## Installation

To use this tool, you need to have Node.js and npm installed on your system.

1. Clone the repository:

    git clone <repository-url>
    cd wordpress-xml-converter

2. Install dependencies:

    npm install

3. Compile the TypeScript code:

    npm run build

4. Make the command globally available:

    npm link

## Usage

Once installed and linked, you can run the tool from any directory on your system.

```bash
wp2md /path/to/your/wordpress-export.xml
```

The script will create a new directory named markdown-posts in the same location as your input XML file. This directory will contain the converted Markdown files.

The script will not deal with associated assets like images. If you want to preserve your images, you'll need to handle them separately.

## How It Works

The script performs the following steps:

1. **Reads the XML File**: It takes the path to your WordPress export file as a command-line argument.
2. **Parses XML**: Using the xml2js library, it parses the XML structure to access all the posts and their associated data.
3. **Filters Posts**: It iterates through the items, processing only published posts and skipping drafts, attachments, or other content types.
4. **Extracts Metadata**: For each post, it extracts the title, publication date, modification date, and any tags.
5. **Converts HTML to Markdown**: The post content, which is stored as HTML within <content:encoded> tags, is converted to Markdown using the turndown library.
6. **Creates YAML Front Matter**: The extracted metadata is formatted into a YAML block using js-yaml.
7. **Saves the File**: The YAML front matter and the Markdown content are combined and saved as a new .md file. The filename is a sanitized, kebab-case version of the post title to ensure it's file-system safe.

Development
If you want to modify the script:

Make your changes in the src/wp2md.ts file.

Re-compile the code by running npm run build.

Since the project is linked, the wp2md command will automatically use the updated version.

License

This project is licensed under the MIT License.
