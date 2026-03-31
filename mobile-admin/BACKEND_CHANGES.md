# Backend Changes for Mobile Auth

Two files need updating. Both are additive — zero impact on the existing web flow.

---

## 1. `POST /api/auth/refresh` — New Endpoint

Add this file: `backend/src/routes/auth.routes.ts` (or wherever login lives)

```typescript
// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
      userId: string;
      orgId: string;
    };

    // Optional: check a token blocklist here if you maintain one

    const newAccessToken = jwt.sign(
      { userId: payload.userId, orgId: payload.orgId },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    return res.json({ data: { accessToken: newAccessToken } });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});
```

> If you don't already have a separate `REFRESH_TOKEN_SECRET` in your `.env`, add one.
> You can use `openssl rand -hex 32` to generate it.

---

## 2. Login endpoint — also return tokens in the response body

In your existing `POST /api/auth/login` handler, after setting the cookie,
also include the tokens in the response JSON:

```typescript
// existing cookie logic stays exactly as-is
res.cookie('token', accessToken, { httpOnly: true, ... });

// ADD: also return tokens for mobile clients
return res.json({
  data: {
    user: { id, email, name, role },
    org:  { id, name, logo, attendanceMode },
    accessToken,   // ← new
    refreshToken,  // ← new
  }
});
```

---

## 3. `authenticate` middleware — accept Bearer header OR cookie

Find your `authenticate` middleware and update the token extraction:

```typescript
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1. Check Bearer header (mobile)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Fall back to httpOnly cookie (web — unchanged)
  if (!token) {
    token = req.cookies?.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; orgId: string };
    req.userId = payload.userId;
    req.orgId  = payload.orgId;
    next();
  } catch {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
};
```

That's it. The web frontend (cookies) keeps working unchanged.
