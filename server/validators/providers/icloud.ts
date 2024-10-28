import { Socket } from 'net';
import { ValidationResult, SmtpResponse } from '../types';

export async function validateIcloud(email: string, host: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const timeout = 10000;
    let buffer = '';
    let stage = 0;

    const commands = [
      'EHLO icloud-validator.local\r\n',
      `MAIL FROM:<verify@icloud-validator.local>\r\n`,
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
          if ([250, 220].includes(response.code)) {
            socket.write(commands[0]);
            stage++;
          } else {
            closeWithResult(false, 'Connection rejected');
          }
          break;

        case 1:
          if (response.code === 250) {
            socket.write(commands[1]);
            stage++;
          } else {
            closeWithResult(false, 'EHLO failed');
          }
          break;

        case 2:
          if (response.code === 250) {
            socket.write(commands[2]);
            stage++;
          } else {
            closeWithResult(false, 'Sender verification failed');
          }
          break;

        case 3:
          if (response.code === 250) {
            closeWithResult(true, 'iCloud address verified');
          } else if ([550, 551, 553].includes(response.code)) {
            closeWithResult(false, 'iCloud address does not exist');
          } else {
            closeWithResult(false, 'iCloud verification failed');
          }
          break;
      }
    });

    socket.on('error', () => {
      closeWithResult(false, 'Connection error');
    });

    socket.on('timeout', () => {
      closeWithResult(false, 'Connection timeout');
    });

    function closeWithResult(isValid: boolean, details: string) {
      try {
        socket.write('QUIT\r\n');
      } catch (error) {
        // Ignore write errors during close
      }
      socket.destroy();
      resolve({ isValid, details });
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