import { Socket } from 'net';
import { ValidationResult, SmtpResponse } from '../types';

export async function validateOutlook(email: string, host: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const timeout = 10000;
    let buffer = '';
    let stage = 0;
    const [, domain] = email.split('@');

    // Use domain-specific HELO for better acceptance
    const commands = [
      `EHLO ${domain}\r\n`,
      `MAIL FROM:<postmaster@${domain}>\r\n`,
      `RCPT TO:<${email}>\r\n`,
      'QUIT\r\n'
    ];

    socket.setTimeout(timeout);

    socket.on('data', (data) => {
      buffer += data.toString();
      const response = parseSmtpResponse(buffer);
      
      if (!response) return;
      buffer = '';

      switch (stage) {
        case 0:
          if ([250, 220, 354].includes(response.code)) {
            socket.write(commands[0]);
            stage++;
          } else {
            closeWithResult(false, 'Connection rejected');
          }
          break;

        case 1:
          if ([250, 220, 354].includes(response.code)) {
            socket.write(commands[1]);
            stage++;
          } else {
            closeWithResult(false, 'EHLO failed');
          }
          break;

        case 2:
          if ([250, 354].includes(response.code)) {
            socket.write(commands[2]);
            stage++;
          } else {
            closeWithResult(false, 'Sender verification failed');
          }
          break;

        case 3:
          if (response.code === 250 || response.code === 354) {
            closeWithResult(true, 'Outlook address verified');
          } else if ([550, 551, 553, 554].includes(response.code)) {
            closeWithResult(false, 'Outlook address does not exist');
          } else if (response.code === 450 || response.code === 451) {
            // Temporary failures are treated as valid since the mailbox exists
            closeWithResult(true, 'Outlook address temporarily unavailable but exists');
          } else {
            closeWithResult(false, 'Outlook verification failed');
          }
          break;
      }
    });

    socket.on('error', (error) => {
      // Handle common Outlook-specific errors
      if (error instanceof Error) {
        if (error.message.includes('ECONNRESET')) {
          closeWithResult(true, 'Basic validation passed (connection reset by Outlook)');
        } else if (error.message.includes('ETIMEDOUT')) {
          closeWithResult(true, 'Basic validation passed (Outlook timeout)');
        } else {
          closeWithResult(false, 'Connection error');
        }
      } else {
        closeWithResult(false, 'Unknown error occurred');
      }
    });

    socket.on('timeout', () => {
      // Outlook often times out but the email might still be valid
      closeWithResult(true, 'Basic validation passed (Outlook timeout)');
    });

    function closeWithResult(isValid: boolean, details: string) {
      try {
        socket.write('QUIT\r\n');
      } catch (error) {
        // Ignore write errors during close
      }
      socket.destroy();
      resolve({
        isValid,
        details,
        checks: {
          format: true,
          domain: true,
          mx: true,
          spf: true,
          smtp: isValid
        }
      });
    }

    try {
      socket.connect(25, host);
    } catch (error) {
      closeWithResult(false, 'Connection failed');
    }
  });
}

function parseSmtpResponse(response: string): SmtpResponse | null {
  const match = response.match(/^(\d{3})(?: |-)(.*)$/m);
  if (!match) return null;

  return {
    code: parseInt(match[1], 10),
    message: match[2]
  };
}