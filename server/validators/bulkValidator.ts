import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateSingleEmail } from './emailValidator.js';
import { createObjectCsvWriter } from 'csv-writer';
import { sendNotificationEmail } from '../utils/mailer.js';
import { processAndStandardizeCSV } from '../utils/storage.js';
import { memoryStore } from '../utils/memoryStore.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 5;
const RATE_LIMIT_DELAY = 2000;

export async function processBulkEmails(
  filePath: string,
  userEmail: string,
  userId: string
): Promise<{ resultPath: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const validationId = uuidv4();
      const fileName = path.basename(filePath);

      // Create initial record
      memoryStore.addRecord(userId, {
        id: validationId,
        fileName,
        status: 'completed',
        totalEmails: 0,
        validEmails: 0,
        invalidEmails: 0,
        createdAt: new Date().toISOString()
      });

      const results: any[] = [];
      let totalRows = 0;
      let processedRows = 0;
      let validCount = 0;
      let invalidCount = 0;
      let errorCount = 0;
      let originalHeaders: string[] = [];

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Standardize the input CSV
      const standardizedPath = path.join(uploadsDir, `standardized_${validationId}.csv`);
      await processAndStandardizeCSV(filePath, standardizedPath);

      // Process the standardized CSV
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      parser.on('headers', (headers) => {
        originalHeaders = headers;
      });

      let currentBatch: any[] = [];

      fs.createReadStream(standardizedPath)
        .pipe(parser)
        .on('data', (row) => {
          totalRows++;
          currentBatch.push(row);
          if (currentBatch.length >= BATCH_SIZE) {
            processBatch([...currentBatch]);
            currentBatch = [];
          }
        })
        .on('end', async () => {
          if (currentBatch.length > 0) {
            await processBatch(currentBatch);
          }
          
          await waitForValidations();
          
          try {
            const outputPath = path.join(
              uploadsDir,
              `validated_${validationId}.csv`
            );

            // Create header with required columns first
            const header = [
              { id: 'name', title: 'Name' },
              { id: 'email', title: 'Email' },
              { id: 'company', title: 'Company' },
              { id: '_validation_status', title: 'Email Validation Status' },
              { id: '_validation_details', title: 'Validation Details' },
              { id: '_format_check', title: 'Format Check' },
              { id: '_domain_check', title: 'Domain Check' },
              { id: '_mx_check', title: 'MX Check' },
              { id: '_spf_check', title: 'SPF Check' },
              { id: '_smtp_check', title: 'SMTP Check' },
              ...originalHeaders
                .filter(header => !['name', 'email', 'company'].includes(header.toLowerCase()))
                .map(header => ({ id: header, title: header }))
            ];

            const csvWriter = createObjectCsvWriter({
              path: outputPath,
              header
            });

            await csvWriter.writeRecords(results);

            // Update validation record
            memoryStore.addRecord(userId, {
              id: validationId,
              fileName,
              status: 'completed',
              totalEmails: totalRows,
              validEmails: validCount,
              invalidEmails: invalidCount + errorCount,
              createdAt: new Date().toISOString(),
              resultPath: outputPath
            });

            // Send email notification
            const emailText = `
Your email validation is complete!

Summary:
- Total emails processed: ${totalRows}
- Valid emails: ${validCount}
- Invalid emails: ${invalidCount}
- Errors: ${errorCount}

Your results file has been processed and is ready for download.`;

            await sendNotificationEmail(userEmail, {
              subject: 'Email Validation Results',
              text: emailText
            });

            resolve({ resultPath: outputPath });

            // Cleanup files
            fs.unlink(standardizedPath, () => {});
            setTimeout(() => {
              fs.unlink(outputPath, () => {});
            }, 3600000); // Delete after 1 hour
          } catch (error) {
            memoryStore.addRecord(userId, {
              id: validationId,
              fileName,
              status: 'error',
              totalEmails: totalRows,
              validEmails: validCount,
              invalidEmails: invalidCount + errorCount,
              createdAt: new Date().toISOString()
            });
            reject(error);
          }
        })
        .on('error', reject);

      async function processBatch(batch: any[]) {
        const validations = batch.map(async (row) => {
          const validatedRow = { ...row };
          const email = row.email;

          if (!email) {
            validatedRow._validation_status = 'Invalid';
            validatedRow._validation_details = 'No email field found';
            validatedRow._format_check = 'Failed';
            validatedRow._domain_check = 'Failed';
            validatedRow._mx_check = 'Failed';
            validatedRow._spf_check = 'Failed';
            validatedRow._smtp_check = 'Failed';
            invalidCount++;
          } else {
            try {
              const validationResult = await validateSingleEmail(email);
              validatedRow._validation_status = validationResult.isValid ? 'Valid' : 'Invalid';
              validatedRow._validation_details = validationResult.details;
              
              if (validationResult.checks) {
                validatedRow._format_check = validationResult.checks.format ? 'Passed' : 'Failed';
                validatedRow._domain_check = validationResult.checks.domain ? 'Passed' : 'Failed';
                validatedRow._mx_check = validationResult.checks.mx ? 'Passed' : 'Failed';
                validatedRow._spf_check = validationResult.checks.spf ? 'Passed' : 'Failed';
                validatedRow._smtp_check = validationResult.checks.smtp ? 'Passed' : 'Failed';
              }

              if (validationResult.isValid) {
                validCount++;
              } else {
                invalidCount++;
              }
            } catch (error) {
              validatedRow._validation_status = 'Error';
              validatedRow._validation_details = 'Validation error occurred';
              validatedRow._format_check = 'Error';
              validatedRow._domain_check = 'Error';
              validatedRow._mx_check = 'Error';
              validatedRow._spf_check = 'Error';
              validatedRow._smtp_check = 'Error';
              errorCount++;
            }
          }

          results.push(validatedRow);
          processedRows++;
        });

        await Promise.all(validations);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      async function waitForValidations() {
        while (processedRows < totalRows) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      reject(error);
    }
  });
}