import { parse } from 'csv-parse';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';

interface CsvRecord {
  [key: string]: string;
}

interface CsvData {
  name?: string;
  email: string;
  company?: string;
  [key: string]: any;
}

export async function processAndStandardizeCSV(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const results: CsvData[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Create read stream for input file
    const readStream = fs.createReadStream(inputPath);

    // Process each row
    parser.on('readable', () => {
      let record: CsvRecord;
      while ((record = parser.read())) {
        // Find email field (case-insensitive)
        const emailField = Object.keys(record).find(key => 
          key.toLowerCase() === 'email' || key.toLowerCase() === 'emails'
        );
        
        // Find name field (case-insensitive)
        const nameField = Object.keys(record).find(key => 
          key.toLowerCase() === 'name' || 
          key.toLowerCase() === 'full name' || 
          key.toLowerCase() === 'fullname'
        );

        // Find company field (case-insensitive)
        const companyField = Object.keys(record).find(key => 
          key.toLowerCase() === 'company' || 
          key.toLowerCase() === 'organization' || 
          key.toLowerCase() === 'organisation'
        );

        // Create standardized record
        const standardizedRecord: CsvData = {
          name: nameField ? record[nameField] : '',
          email: emailField ? record[emailField] : '',
          company: companyField ? record[companyField] : ''
        };

        // Add all other fields as extra columns
        Object.keys(record).forEach(key => {
          if (![emailField, nameField, companyField].includes(key)) {
            standardizedRecord[key] = record[key];
          }
        });

        results.push(standardizedRecord);
      }
    });

    // Handle parsing completion
    parser.on('end', async () => {
      try {
        // Get all unique headers from the data
        const headers = new Set<string>();
        results.forEach(record => {
          Object.keys(record).forEach(key => headers.add(key));
        });

        // Create CSV writer with standardized headers
        const csvWriter = createObjectCsvWriter({
          path: outputPath,
          header: [
            { id: 'name', title: 'Name' },
            { id: 'email', title: 'Email' },
            { id: 'company', title: 'Company' },
            // Add validation result columns
            { id: '_validation_status', title: 'Email Validation Status' },
            { id: '_validation_details', title: 'Validation Details' },
            { id: '_format_check', title: 'Format Check' },
            { id: '_domain_check', title: 'Domain Check' },
            { id: '_mx_check', title: 'MX Check' },
            { id: '_spf_check', title: 'SPF Check' },
            { id: '_smtp_check', title: 'SMTP Check' },
            // Add remaining headers as extra columns
            ...[...headers]
              .filter(header => !['name', 'email', 'company'].includes(header))
              .map(header => ({ id: header, title: header }))
          ]
        });

        await csvWriter.writeRecords(results);
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    // Handle errors
    parser.on('error', reject);
    readStream.on('error', reject);

    // Start processing
    readStream.pipe(parser);
  });
}