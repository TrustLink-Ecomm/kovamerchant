"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { invoicesApi } from "../../../lib/api";
import type { MerchantInvoice, InvoiceStatus } from "../../../lib/types";

function invoiceBadge(s: InvoiceStatus) {
  const map: Record<InvoiceStatus, string> = {
    GENERATED: "bg-gray-100 text-gray-600",
    SENT: "bg-blue-50 text-blue-700",
    PAID: "bg-emerald-50 text-emerald-700",
  };
  return map[s];
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<MerchantInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoicesApi.get(Number(id))
      .then(setInvoice)
      .catch(() => setError("Invoice not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return <div className="p-8 text-center text-muted text-sm">{error ?? "Invoice not found."}</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/invoices" className="p-2 rounded-xl text-muted hover:bg-brand-muted transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted mt-0.5">
            {new Date(invoice.periodStart).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}
            {" – "}
            {new Date(invoice.periodEnd).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${invoiceBadge(invoice.status)}`}>
          {invoice.status}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Value", value: `GHS ${invoice.totalOrderValue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`, accent: true },
          { label: "Total Orders", value: String(invoice.totalOrders) },
          { label: "Generated", value: new Date(invoice.generatedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" }) },
        ].map((c) => (
          <div key={c.label} className="bg-surface rounded-2xl border border-border shadow-sm p-5">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.accent ? "text-brand" : "text-foreground"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Line items */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Order / Product</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Buyer</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Qty</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Total</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoice.items.map((item) => (
              <tr key={item.id} className="hover:bg-background transition">
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{item.orderId}</p>
                  <p className="text-xs text-muted mt-0.5">{item.productName}</p>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <p className="font-medium text-foreground">{item.buyerName}</p>
                  <p className="text-xs text-muted">{item.buyerPhone}</p>
                </td>
                <td className="px-5 py-4 text-center text-muted hidden sm:table-cell">{item.quantity}</td>
                <td className="px-5 py-4 text-right font-semibold text-foreground">
                  GHS {item.totalPrice.toFixed(2)}
                </td>
                <td className="px-5 py-4 text-center hidden sm:table-cell">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${item.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"}`}>
                    {item.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border">
            <tr>
              <td colSpan={3} className="px-5 py-4 text-sm font-semibold text-foreground hidden sm:table-cell">Total</td>
              <td colSpan={3} className="px-5 py-4 text-sm font-semibold text-foreground sm:hidden">Total</td>
              <td className="px-5 py-4 text-right text-sm font-bold text-brand">
                GHS {invoice.totalOrderValue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
              </td>
              <td className="hidden sm:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
