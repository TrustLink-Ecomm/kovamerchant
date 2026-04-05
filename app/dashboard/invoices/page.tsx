"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { invoicesApi } from "../../lib/api";
import type { MerchantInvoice, InvoiceStatus } from "../../lib/types";

function invoiceBadge(s: InvoiceStatus) {
  const map: Record<InvoiceStatus, string> = {
    GENERATED: "bg-gray-100 text-gray-600",
    SENT: "bg-blue-50 text-blue-700",
    PAID: "bg-emerald-50 text-emerald-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<MerchantInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  function load(p: number) {
    setLoading(true);
    invoicesApi.list(p, 20)
      .then((res) => {
        setInvoices(res.content);
        setTotal(res.totalElements);
        setTotalPages(res.totalPages);
        setPage(res.number);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(0); }, []);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-sm text-muted mt-0.5">{total} invoice{total !== 1 ? "s" : ""} · Generated automatically by the platform</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-muted text-sm">No invoices yet.</div>
      ) : (
        <>
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Period</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Value</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Orders</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-background transition">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted mt-0.5">Generated {new Date(inv.generatedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </td>
                    <td className="px-5 py-4 text-muted hidden md:table-cell">
                      {new Date(inv.periodStart).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(inv.periodEnd).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-foreground">
                      GHS {inv.totalOrderValue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-center text-muted hidden sm:table-cell">{inv.totalOrders}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${invoiceBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/invoices/${inv.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand hover:bg-brand-muted transition">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 text-sm">
              <span className="text-muted">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => load(page - 1)} disabled={page === 0}
                  className="px-4 py-2 rounded-xl border border-border text-foreground font-medium hover:bg-background disabled:opacity-40 transition">
                  Previous
                </button>
                <button onClick={() => load(page + 1)} disabled={page + 1 >= totalPages}
                  className="px-4 py-2 rounded-xl border border-border text-foreground font-medium hover:bg-background disabled:opacity-40 transition">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
