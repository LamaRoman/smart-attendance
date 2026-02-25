#!/usr/bin/env python3
"""
fix_typescript.py — smart-attendance-backend
Fixes all TypeScript build errors + missing schema fields.
Run from: backend/ folder
"""

import os
import re
import json

BASE = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✔ Updated: {os.path.relpath(path, BASE)}")

def no_change(path):
    print(f"  — No change needed: {os.path.relpath(path, BASE)}")

# ─────────────────────────────────────────────────────────────
# 1. Create src/types/express.d.ts  (fixes ALL AuthRequest errors)
# ─────────────────────────────────────────────────────────────
def fix_express_types():
    print("\n[1] Creating src/types/express.d.ts ...")
    content = '''import { JWTPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface User extends JWTPayload {}
  }
}

export {};
'''
    write(os.path.join(BASE, "src", "types", "express.d.ts"), content)


# ─────────────────────────────────────────────────────────────
# 2. Fix auth.service.ts — add missing `id` field to generateToken
# ─────────────────────────────────────────────────────────────
def fix_auth_service():
    print("\n[2] Fixing src/services/auth.service.ts ...")
    path = os.path.join(BASE, "src", "services", "auth.service.ts")
    if not os.path.exists(path):
        print(f"  ⚠ Not found, skipping.")
        return

    content = read(path)
    original = content

    # Fix generateToken call missing `id` field
    # Only add if id: user.id is not already there
    content = re.sub(
        r'(generateToken\(\{[^}]*?userId:\s*user\.id,)(\s*)(?!\s*id:)',
        r'\1\2id: user.id,\2',
        content,
        flags=re.DOTALL
    )

    if content != original:
        write(path, content)
    else:
        no_change(path)


# ─────────────────────────────────────────────────────────────
# 3. Fix Prisma schema — add missing fields/enum values
# ─────────────────────────────────────────────────────────────
def fix_prisma_schema():
    print("\n[3] Fixing prisma/schema.prisma ...")
    path = os.path.join(BASE, "prisma", "schema.prisma")
    if not os.path.exists(path):
        print(f"  ⚠ schema.prisma not found, skipping.")
        return

    content = read(path)
    original = content

    # 3a. Add attendancePinHash back to User model
    if "attendancePinHash" not in content:
        lines = content.split("\n")
        new_lines = []
        in_user_model = False
        pin_added = False
        for line in lines:
            if re.match(r'^model User \{', line):
                in_user_model = True
            if in_user_model and re.match(r'^\}', line):
                in_user_model = False
            new_lines.append(line)
            if in_user_model and not pin_added and re.match(r'\s+password\s+String', line):
                indent = re.match(r'(\s+)', line).group(1) if re.match(r'(\s+)', line) else "  "
                new_lines.append(f"{indent}attendancePinHash String?")
                pin_added = True
                print("    ✔ Added attendancePinHash to User model")
        content = "\n".join(new_lines)
    else:
        print("    — attendancePinHash already exists in User model")

    # 3b. Add NEEDS_RECALCULATION to PayrollStatus enum
    if "NEEDS_RECALCULATION" not in content:
        # Find the enum and add before the first value
        def add_enum_value(m):
            body = m.group(2)
            # Add at the beginning of the enum body
            first_value = re.search(r'\n(\s+\w)', body)
            if first_value:
                insert_at = first_value.start() + 1
                indent = first_value.group(1)[:-1]  # just the whitespace
                body = body[:insert_at] + indent + "NEEDS_RECALCULATION\n" + body[insert_at:]
            return m.group(1) + body + m.group(3)

        content = re.sub(
            r'(enum PayrollStatus \{)(.*?)(\})',
            add_enum_value,
            content,
            flags=re.DOTALL
        )
        print("    ✔ Added NEEDS_RECALCULATION to PayrollStatus enum")
    else:
        print("    — NEEDS_RECALCULATION already in PayrollStatus enum")

    # 3c. Add featureTotp to PricingPlan model
    if "featureTotp" not in content:
        def add_feature_totp(m):
            body = m.group(0)
            # Find @@map line and insert before it
            map_match = re.search(r'\n(\s+@@map)', body)
            if map_match:
                return body[:map_match.start()] + "\n  featureTotp        Boolean  @default(false)" + body[map_match.start():]
            # Fallback: before closing brace
            return body[:-1] + "  featureTotp        Boolean  @default(false)\n}"
        
        content = re.sub(
            r'model PricingPlan \{.*?\}',
            add_feature_totp,
            content,
            flags=re.DOTALL
        )
        print("    ✔ Added featureTotp to PricingPlan model")
    else:
        print("    — featureTotp already in PricingPlan model")

    # 3d. Add payrollEnabled to Organization model (if not already added)
    if "payrollEnabled" not in content:
        lines = content.split("\n")
        new_lines = []
        in_org_model = False
        added = False
        for line in lines:
            if re.match(r'^model Organization \{', line):
                in_org_model = True
            if in_org_model and re.match(r'^\}', line):
                in_org_model = False
            new_lines.append(line)
            if in_org_model and not added and "attendanceMode" in line:
                new_lines.append("  payrollEnabled     Boolean  @default(true)")
                added = True
                print("    ✔ Added payrollEnabled to Organization model")
        content = "\n".join(new_lines)
    else:
        print("    — payrollEnabled already in Organization model")

    if content != original:
        write(path, content)
    else:
        no_change(path)


# ─────────────────────────────────────────────────────────────
# 4. Fix superadmin.subscription.service.ts
# ─────────────────────────────────────────────────────────────
def fix_superadmin_subscription():
    print("\n[4] Fixing src/services/superadmin.subscription.service.ts ...")
    path = os.path.join(BASE, "src", "services", "superadmin.subscription.service.ts")
    if not os.path.exists(path):
        print(f"  ⚠ Not found, skipping.")
        return

    content = read(path)
    original = content

    # Fix null index: countMap[row.organizationId] → countMap[row.organizationId!]
    content = re.sub(
        r'countMap\[row\.organizationId\](?!!)',
        'countMap[row.organizationId!]',
        content
    )

    # Add forceTrial and billingCycle to input type
    if "forceTrial" not in content:
        # Try to find the input type definition for the upgrade function
        content = re.sub(
            r'(\{\s*\n\s*tier:\s*TierName[^}]*?note\?:\s*string[^}]*?)(\n\s*\})',
            r'\1\n  forceTrial?: boolean;\n  billingCycle?: string;\2',
            content,
            flags=re.DOTALL
        )

    if content != original:
        write(path, content)
    else:
        no_change(path)


# ─────────────────────────────────────────────────────────────
# 5. Fix superAdmin.service.ts — null index type errors
# ─────────────────────────────────────────────────────────────
def fix_superadmin_service():
    print("\n[5] Fixing src/services/superAdmin.service.ts ...")
    path = os.path.join(BASE, "src", "services", "superAdmin.service.ts")
    if not os.path.exists(path):
        print(f"  ⚠ Not found, skipping.")
        return

    content = read(path)
    original = content

    # Fix: roleMap[row.organizationId] → roleMap[row.organizationId!]
    content = re.sub(
        r'roleMap\[row\.organizationId\](?!!)',
        'roleMap[row.organizationId!]',
        content
    )

    if content != original:
        write(path, content)
    else:
        no_change(path)


# ─────────────────────────────────────────────────────────────
# 6. Fix payslip-pdf.service.ts — v > 0 with mixed types
# ─────────────────────────────────────────────────────────────
def fix_payslip_pdf():
    print("\n[6] Fixing src/services/payslip-pdf.service.ts ...")
    path = os.path.join(BASE, "src", "services", "payslip-pdf.service.ts")
    if not os.path.exists(path):
        print(f"  ⚠ Not found, skipping.")
        return

    content = read(path)
    original = content

    # Fix: ([, v]) => v > 0  →  ([, v]) => Number(v) > 0
    content = re.sub(
        r'\(\[,\s*v\]\)\s*=>\s*v\s*>',
        '([, v]) => Number(v) >',
        content
    )

    if content != original:
        write(path, content)
    else:
        no_change(path)


# ─────────────────────────────────────────────────────────────
# 7. Fix payroll.service.ts — null organizationId in where clause
# ─────────────────────────────────────────────────────────────
def fix_payroll_service():
    print("\n[7] Fixing src/services/payroll.service.ts ...")
    path = os.path.join(BASE, "src", "services", "payroll.service.ts")
    if not os.path.exists(path):
        print(f"  ⚠ Not found, skipping.")
        return

    content = read(path)
    original = content

    # Fix: where: { organizationId: someNullableVar }
    # Change nullable organizationId in where clauses to use ?? undefined
    # This targets the specific pattern from error line 505
    content = re.sub(
        r'(where:\s*\{\s*\n\s*organizationId:\s*)([^,\n}]+?)(\s*\n\s*\})',
        lambda m: m.group(1) + (m.group(2).rstrip() + " ?? undefined" if "??" not in m.group(2) and "undefined" not in m.group(2) else m.group(2).rstrip()) + m.group(3),
        content
    )

    if content != original:
        write(path, content)
    else:
        no_change(path)


# ─────────────────────────────────────────────────────────────
# 8. Fix billing jobs — add organizationId to billingLog.create
# ─────────────────────────────────────────────────────────────
def fix_billing_jobs():
    print("\n[8] Fixing billing log jobs ...")
    job_files = [
        os.path.join(BASE, "src", "jobs", "abandoned.job.ts"),
        os.path.join(BASE, "src", "jobs", "grace-period.job.ts"),
        os.path.join(BASE, "src", "jobs", "trial-expiry.job.ts"),
        os.path.join(BASE, "src", "services", "billing.job.ts"),
    ]

    for path in job_files:
        if not os.path.exists(path):
            print(f"  ⚠ Not found: {os.path.relpath(path, BASE)}, skipping.")
            continue

        content = read(path)
        original = content

        # Only add if not already there
        if "organizationId: subscription.organizationId" not in content:
            content = re.sub(
                r'(subscriptionId:\s*subscription\.id,)',
                r'\1\n            organizationId: subscription.organizationId,',
                content
            )

        if content != original:
            write(path, content)
        else:
            no_change(path)


# ─────────────────────────────────────────────────────────────
# 9. Fix rateLimiter.ts — duplicate property
# ─────────────────────────────────────────────────────────────
def fix_rate_limiter():
    print("\n[9] Checking src/middleware/rateLimiter.ts for duplicate properties ...")
    path = os.path.join(BASE, "src", "middleware", "rateLimiter.ts")
    if not os.path.exists(path):
        print(f"  ⚠ Not found, skipping.")
        return

    content = read(path)
    original = content
    lines = content.split("\n")
    new_lines = []
    brace_depth = 0
    seen = {}

    for i, line in enumerate(lines):
        # Count braces but ignore template literals
        stripped = re.sub(r'`[^`]*`', '', line)
        opens = stripped.count("{")
        closes = stripped.count("}")

        match = re.match(r'\s+([\w]+)\s*:', line)
        if match and brace_depth > 0:
            key = f"{brace_depth}:{match.group(1)}"
            if key in seen:
                print(f"    ✔ Removed duplicate '{match.group(1)}' at line {i+1}")
                brace_depth = max(0, brace_depth + opens - closes)
                continue
            seen[key] = i

        brace_depth = max(0, brace_depth + opens - closes)
        if brace_depth == 0:
            seen = {}
        new_lines.append(line)

    content = "\n".join(new_lines)

    if content != original:
        write(path, content)
    else:
        print("  — No duplicate properties found.")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  smart-attendance TypeScript Fix Script v2")
    print("=" * 60)

    fix_express_types()
    fix_auth_service()
    fix_prisma_schema()
    fix_superadmin_subscription()
    fix_superadmin_service()
    fix_payslip_pdf()
    fix_payroll_service()
    fix_billing_jobs()
    fix_rate_limiter()

    print("\n" + "=" * 60)
    print("  Done! Now run:")
    print("=" * 60)
    print("""
  1. npm install --save-dev @types/uuid
  2. npx prisma migrate dev --name fix-missing-fields
  3. npx tsc --noEmit
  4. npm run dev
""")