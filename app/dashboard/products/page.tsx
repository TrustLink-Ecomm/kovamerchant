"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { productsApi } from "../../lib/api";
import type { MerchantProduct } from "../../lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load(p: number) {
    setLoading(true);
    productsApi.list(p, 20, "createdAt,desc")
      .then((res) => {
        setProducts(res.content);
        setTotal(res.totalElements);
        setTotalPages(res.totalPages);
        setPage(res.number);
      })
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(0); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await productsApi.delete(id);
      load(page);
    } catch {
      alert("Failed to delete product.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted mt-0.5">{total} listing{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-light transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Product
        </Link>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted text-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand-muted flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2f4561" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
          </div>
          <p className="font-medium">No products yet</p>
          <p className="mt-1">Add your first product to start selling.</p>
        </div>
      ) : (
        <>
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Product</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Price</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Stock</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-background transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0 bg-background" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2f4561" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          {p.description && <p className="text-xs text-muted line-clamp-1 mt-0.5">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted hidden md:table-cell">{p.categoryName}</td>
                    <td className="px-5 py-4 text-right font-semibold text-foreground">
                      GHS {p.price.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right hidden sm:table-cell">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${p.stockQuantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {p.stockQuantity}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/products/${p.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand hover:bg-brand-muted transition"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {deletingId === p.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 text-sm">
              <span className="text-muted">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => load(page - 1)}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-xl border border-border text-foreground font-medium hover:bg-background disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => load(page + 1)}
                  disabled={page + 1 >= totalPages}
                  className="px-4 py-2 rounded-xl border border-border text-foreground font-medium hover:bg-background disabled:opacity-40 transition"
                >
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
