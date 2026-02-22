import { PrismaClient, Role } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ── Magic byte signatures for file type validation ──
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
};

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;   // 5MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;  // 20MB per employee

const UPLOAD_BASE = path.join(__dirname, '../../uploads/documents');

function validateMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return false;
  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    return sig.every((byte, i) => buffer[i] === byte);
  });
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 200);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── Upload ──

interface UploadDocumentParams {
  userId: string;
  uploaderId: string;
  uploaderRole: Role;
  uploaderOrgId: string;
  file: Express.Multer.File;
  documentTypeId: string;
  description?: string;
}

export async function uploadDocument(params: UploadDocumentParams) {
  const { userId, uploaderId, uploaderRole, uploaderOrgId, file, documentTypeId, description } = params;

  // 1. Verify target user exists and belongs to same org
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true },
  });
  if (!targetUser || targetUser.organizationId !== uploaderOrgId) {
    throw { status: 404, message: 'User not found' };
  }

  // 2. Employee can only upload for self
  if (uploaderRole === 'EMPLOYEE' && userId !== uploaderId) {
    throw { status: 403, message: 'You can only upload documents for yourself' };
  }

  // 3. Verify document type belongs to same org and is active
  const docType = await prisma.documentType.findUnique({
    where: { id: documentTypeId },
  });
  if (!docType || docType.organizationId !== uploaderOrgId) {
    throw { status: 400, message: 'Invalid document type' };
  }
  if (!docType.isActive) {
    throw { status: 400, message: 'This document type is no longer active' };
  }

  // 4. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw { status: 400, message: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' };
  }

  // 5. Validate magic bytes
  const fileBuffer = fs.readFileSync(file.path);
  if (!validateMagicBytes(fileBuffer, file.mimetype)) {
    fs.unlinkSync(file.path);
    throw { status: 400, message: 'File content does not match its declared type.' };
  }

  // 6. Check file size
  if (file.size > MAX_FILE_SIZE) {
    fs.unlinkSync(file.path);
    throw { status: 400, message: 'File size exceeds 5MB limit.' };
  }

  // 7. Check total storage per employee
  const existingDocs = await prisma.employeeDocument.aggregate({
    where: { userId },
    _sum: { fileSize: true },
  });
  const currentTotal = existingDocs._sum.fileSize || 0;
  if (currentTotal + file.size > MAX_TOTAL_SIZE) {
    fs.unlinkSync(file.path);
    throw { status: 400, message: 'Total document storage exceeds 20MB limit for this employee.' };
  }

  // 8. Move file to permanent storage
  const sanitized = sanitizeFileName(file.originalname);
  const storedName = `${uuidv4()}-${sanitized}`;
  const destDir = path.join(UPLOAD_BASE, uploaderOrgId, userId);
  ensureDir(destDir);
  const destPath = path.join(destDir, storedName);
  fs.renameSync(file.path, destPath);

  // 9. Create DB record
  const document = await prisma.employeeDocument.create({
    data: {
      userId,
      organizationId: uploaderOrgId,
      documentTypeId,
      fileName: storedName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      description: description || null,
      uploadedBy: uploaderId,
    },
    include: {
      documentType: { select: { id: true, name: true, nameNp: true } },
    },
  });

  return document;
}

// ── List ──

interface ListDocumentsParams {
  userId: string;
  requesterId: string;
  requesterRole: Role;
  requesterOrgId: string;
}

export async function listDocuments(params: ListDocumentsParams) {
  const { userId, requesterId, requesterRole, requesterOrgId } = params;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true },
  });
  if (!targetUser || targetUser.organizationId !== requesterOrgId) {
    throw { status: 404, message: 'User not found' };
  }

  if (requesterRole === 'EMPLOYEE' && userId !== requesterId) {
    throw { status: 403, message: 'Access denied' };
  }

  return prisma.employeeDocument.findMany({
    where: { userId, organizationId: requesterOrgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      fileSize: true,
      description: true,
      createdAt: true,
      documentType: { select: { id: true, name: true, nameNp: true } },
    },
  });
}

// ── Download ──

interface DownloadDocumentParams {
  documentId: string;
  requesterId: string;
  requesterRole: Role;
  requesterOrgId: string;
}

export async function getDocumentForDownload(params: DownloadDocumentParams) {
  const { documentId, requesterId, requesterRole, requesterOrgId } = params;

  const doc = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.organizationId !== requesterOrgId) {
    throw { status: 404, message: 'Document not found' };
  }

  if (requesterRole === 'EMPLOYEE' && doc.userId !== requesterId) {
    throw { status: 403, message: 'Access denied' };
  }

  const filePath = path.join(UPLOAD_BASE, doc.organizationId, doc.userId, doc.fileName);
  if (!fs.existsSync(filePath)) {
    throw { status: 404, message: 'File not found on disk' };
  }

  return { filePath, originalName: doc.originalName, mimeType: doc.mimeType };
}

// ── Delete ──

interface DeleteDocumentParams {
  documentId: string;
  requesterId: string;
  requesterRole: Role;
  requesterOrgId: string;
}

export async function deleteDocument(params: DeleteDocumentParams) {
  const { documentId, requesterId, requesterRole, requesterOrgId } = params;

  const doc = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.organizationId !== requesterOrgId) {
    throw { status: 404, message: 'Document not found' };
  }

  if (requesterRole === 'EMPLOYEE' && doc.userId !== requesterId) {
    throw { status: 403, message: 'Access denied' };
  }

  const filePath = path.join(UPLOAD_BASE, doc.organizationId, doc.userId, doc.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.employeeDocument.delete({ where: { id: documentId } });
  return { success: true };
}