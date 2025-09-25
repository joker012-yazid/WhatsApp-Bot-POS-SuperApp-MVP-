import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { sanitizeValue } from './sanitize.util';

@Injectable()
export class PiiRedactionMiddleware implements NestMiddleware {
  use(req: Request & { sanitizedBody?: unknown }, _res: Response, next: () => void) {
    if (req.body) {
      req.sanitizedBody = sanitizeValue(req.body);
    }
    next();
  }
}
