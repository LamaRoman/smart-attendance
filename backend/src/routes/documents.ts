import { Router, Response } from 'express';
import {Role} from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireFeature } from "../middleware/feature.guard";
import multer from 'multer';
import path from 'path';
import os from 'os';
import {
  uploadDocument,
  listDocuments,
  getDocumentForDownload,
  deleteDocument,
} from '../services/documents.service';

const router = Router();

// ── Multer config ──
const upload = multer({
  dest: path.join(os.tmpdir(), 'attendance-uploads'),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
  },
});

// ── POST /api/users/:id/documents ──
router.post(
  '/documents/user/:id',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      if (!req.body.documentTypeId) {
        return res.status(400).json({ error: 'Document type is required' });
      }

      const document = await uploadDocument({
        userId: req.params.id,
        uploaderId: req.user!.userId,
        uploaderRole: req.user!.role as Role,
        uploaderOrgId: req.user!.organizationId!,
        file: req.file,
        documentTypeId: req.body.documentTypeId,
        description: req.body.description,
      });

      return res.status(201).json(document);
    } catch (err: any) {
      return res.status(err.status || 500).json({ error: err.message || 'Upload failed' });
    }
  }
);

// ── GET /api/users/:id/documents ──
router.get('/documents/user/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log("DOC_LIST_DEBUG", { paramId: req.params.id, userId: req.user?.id, role: req.user?.role, orgId: req.user?.organizationId });
    const documents = await listDocuments({
      userId: req.params.id,
      requesterId: req.user!.userId,
      requesterRole: req.user!.role as Role,
      requesterOrgId: req.user!.organizationId!,
    });
    return res.json(documents);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to list documents' });
  }
});

// ── GET /api/documents/:id/download ──
router.get('/documents/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { filePath, originalName, mimeType } = await getDocumentForDownload({
      documentId: req.params.id,
      requesterId: req.user!.userId,
      requesterRole: req.user!.role as Role,
      requesterOrgId: req.user!.organizationId!,
    });

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    return res.sendFile(filePath);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || 'Download failed' });
  }
});

// ── DELETE /api/documents/:id ──
router.delete('/documents/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await deleteDocument({
      documentId: req.params.id,
      requesterId: req.user!.userId,
      requesterRole: req.user!.role as Role,
      requesterOrgId: req.user!.organizationId!,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || 'Delete failed' });
  }
});

// ── Multer error handler ──
router.use((err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;