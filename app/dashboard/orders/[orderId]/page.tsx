"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ordersApi } from "../../../lib/api";
import type { MerchantOrder, OrderStatus } from "../../../lib/types";

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

function statusBadge(s: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    PROCESSING: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-600",
  };
  return map[s];
}

function paymentBadge(s: string) {
  if (s === "PAID") return "bg-emerald-50 text-emerald-700";
  if (s === "REJECTED") return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-700";
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<MerchantOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    ordersApi.get(orderId)
      .then(setOrder)
      .catch(() => setError("Order not found."))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function updateStatus(orderStatus: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await ordersApi.updateStatus(orderId, { orderStatus });
      setOrder(updated);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? "Failed to update order.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleConfirmPayment() {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await ordersApi.confirmPayment(orderId);
      setOrder((prev) => prev ? {
        ...prev,
        paymentStatus: res.paymentStatus,
        paymentTransactionId: res.paymentTransactionId,
        payerMomoNumber: res.payerMomoNumber,
        merchantConfirmedPaidAt: res.merchantConfirmedPaidAt,
      } : prev);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? "Failed to confirm payment.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleRejectPayment() {
    if (!order || !rejectReason.trim()) {
      setRejectError("Please enter a reason for rejection.");
      return;
    }
    setUpdating(true);
    setRejectError(null);
    try {
      const res = await ordersApi.rejectPayment(orderId, rejectReason.trim());
      setOrder((prev) => prev ? {
        ...prev,
        paymentStatus: res.paymentStatus,
        paymentRejectionReason: res.paymentRejectionReason,
      } : prev);
      setRejectOpen(false);
      setRejectReason("");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setRejectError(e.message ?? "Failed to reject payment.");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return <div className="p-8 text-center text-muted text-sm">{error ?? "Order not found."}</div>;
  }

  const nextStatuses = STATUS_TRANSITIONS[order.status];
  const canActOnPayment = order.paymentStatus === "PENDING" && order.status !== "CANCELLED";
  const hasActions = nextStatuses.length > 0 || canActOnPayment;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/orders" className="p-2 rounded-xl text-muted hover:bg-brand-muted transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{order.orderId}</h1>
          <p className="text-sm text-muted mt-0.5">
            {new Date(order.orderDate).toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${statusBadge(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {/* Actions */}
        {hasActions && (
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Actions</h2>

            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updating}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
                    s === "CANCELLED"
                      ? "border border-red-200 text-red-600 hover:bg-red-50"
                      : "bg-brand text-white hover:bg-brand-light"
                  }`}
                >
                  {updating ? "…" : `Mark as ${s}`}
                </button>
              ))}

              {canActOnPayment && !rejectOpen && (
                <>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={updating}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-60"
                  >
                    {updating ? "…" : "Confirm Payment"}
                  </button>
                  <button
                    onClick={() => setRejectOpen(true)}
                    disabled={updating}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                  >
                    Reject Payment
                  </button>
                </>
              )}
            </div>

            {/* Inline reject form */}
            {rejectOpen && (
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">Reason for rejection</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); setRejectError(null); }}
                  rows={3}
                  placeholder="e.g. Transaction ID not found in merchant MoMo account"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition resize-none"
                />
                {rejectError && (
                  <p className="text-xs text-red-600">{rejectError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleRejectPayment}
                    disabled={updating}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
                  >
                    {updating ? "…" : "Confirm Rejection"}
                  </button>
                  <button
                    onClick={() => { setRejectOpen(false); setRejectReason(""); setRejectError(null); }}
                    disabled={updating}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted hover:bg-background transition disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order details */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Buyer</h2>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow label="Name" value={order.buyerName} />
              <InfoRow label="Phone" value={order.buyerPhone} />
              {order.deliveryAddress && <InfoRow label="Address" value={order.deliveryAddress} />}
              {order.notes && <InfoRow label="Notes" value={order.notes} />}
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Order Info</h2>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow label="Product" value={order.productName} />
              <InfoRow label="Unit price" value={`GHS ${order.productPrice.toFixed(2)}`} />
              <InfoRow label="Quantity" value={String(order.quantity)} />
              <InfoRow label="Total" value={`GHS ${order.totalPrice.toFixed(2)}`} bold />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Payment</h2>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow label="Method" value={order.paymentMethod.replace("_", " ")} />
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted shrink-0">Status</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${paymentBadge(order.paymentStatus)}`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.merchantMomo && (
                <>
                  <InfoRow label="MoMo name" value={order.merchantMomo.accountName} />
                  <InfoRow label="MoMo number" value={order.merchantMomo.phoneNumber} />
                  <InfoRow label="Network" value={order.merchantMomo.network} />
                </>
              )}
              {order.paymentStatus === "PAID" && order.paymentTransactionId && (
                <InfoRow label="Transaction ID" value={order.paymentTransactionId} />
              )}
              {order.paymentStatus === "PAID" && order.payerMomoNumber && (
                <InfoRow label="Payer MoMo" value={order.payerMomoNumber} />
              )}
              {order.paymentStatus === "PAID" && order.merchantConfirmedPaidAt && (
                <InfoRow label="Confirmed at" value={new Date(order.merchantConfirmedPaidAt).toLocaleString("en-GH")} />
              )}
              {order.paymentStatus === "REJECTED" && order.paymentRejectionReason && (
                <div className="mt-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                  <p className="text-xs text-red-600 font-medium mb-0.5">Rejection reason</p>
                  <p className="text-xs text-red-500">{order.paymentRejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Timeline</h2>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow label="Placed" value={new Date(order.orderDate).toLocaleString("en-GH")} />
              <InfoRow label="Updated" value={new Date(order.updatedAt).toLocaleString("en-GH")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted shrink-0">{label}</span>
      <span className={`text-right ${bold ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{value}</span>
    </div>
  );
}
