import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();

    let errorPayload: object;
    if (exception instanceof Error) {
      errorPayload = { name: exception.name, message: exception.message };
    } else if (typeof exception === 'object' && exception !== null) {
      errorPayload = exception;
    } else {
      errorPayload = { message: String(exception) };
    }

    client.emit('error', {
      event: 'error',
      data: {
        ...errorPayload,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
