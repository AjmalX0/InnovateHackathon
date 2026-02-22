"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerConfig = void 0;
const multer_1 = require("multer");
const path_1 = require("path");
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const ALLOWED_MIME = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: (0, path_1.join)(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
            const ext = (0, path_1.extname)(file.originalname).toLowerCase();
            cb(null, `${(0, uuid_1.v4)()}${ext}`);
        },
    }),
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new common_1.BadRequestException(`Unsupported file type "${file.mimetype}". Allowed: PDF, JPEG, PNG, WEBP`), false);
        }
    },
};
//# sourceMappingURL=multer.config.js.map