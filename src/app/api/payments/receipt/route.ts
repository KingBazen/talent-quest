import { ok, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import { attachReceipt, PaymentValidationError } from "@/lib/payments";
import {
  ReceiptValidationError,
  UploadsNotConfiguredError,
  uploadReceiptImage,
} from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Attach a bank-transfer receipt screenshot to a pending payment.
 *
 * Expects multipart/form-data with:
 *   - paymentId: string  (the pending bank_transfer payment to attach to)
 *   - file:      File    (PNG / JPG / WebP, ≤ 5 MB)
 *
 * Pushes the file to Cloudinary server-side, then updates the payment row.
 * Status remains 'pending' — an admin reviews and marks 'succeeded' via the
 * existing override flow.
 */
export const POST = route(async (req: Request) => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  if (c.withdrawn_at) throw new ApiError(403, "Account withdrawn");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart/form-data body");
  }

  const paymentId = String(form.get("paymentId") || "");
  if (!paymentId.startsWith("pay_")) {
    throw new ApiError(422, "paymentId is required");
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(422, "file is required");
  }

  try {
    const uploaded = await uploadReceiptImage({
      contestantId: c.id,
      paymentId,
      file,
    });
    const updated = await attachReceipt({
      paymentId,
      contestantId: c.id,
      receiptUrl: uploaded.secureUrl,
    });
    return ok({
      paymentId: updated.id,
      receiptUrl: updated.receipt_url,
      status: updated.status,
    });
  } catch (e) {
    if (e instanceof ReceiptValidationError) throw new ApiError(422, e.message);
    if (e instanceof PaymentValidationError) throw new ApiError(422, e.message);
    if (e instanceof UploadsNotConfiguredError) throw new ApiError(503, e.message);
    throw e;
  }
});
