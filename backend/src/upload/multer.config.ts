import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/** Allowed MIME types for document upload. */
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

/** Max file size: 10 MB */
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads'),
    filename: (_req, file, cb) => {
      // e.g.  <uuid>.pdf
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),

  limits: { fileSize: MAX_SIZE_BYTES },

  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `Unsupported file type "${file.mimetype}". Allowed: PDF, JPEG, PNG, WEBP`,
        ),
        false,
      );
    }
  },
};
