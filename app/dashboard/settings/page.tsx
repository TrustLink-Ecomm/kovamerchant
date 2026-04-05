"use client";

import { useEffect, useState } from "react";
import { momoApi } from "../../lib/api";
import type { MerchantInfo, MomoAccount, MomoNetwork } from "../../lib/types";

const NETWORKS: MomoNetwork[] = ["MTN", "VODAFONE", "AIRTELTIGO"];

const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [momo, setMomo] = useState<MomoAccount | null>(null);
  const [momoForm, setMomoForm] = useState({ accountName: "", phoneNumber: "", network: "MTN" as MomoNetwork });
  const [savingMomo, setSavingMomo] = useState(false);
  const [momoSuccess, setMomoSuccess] = useState(false);
  const [momoError, setMomoError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kova_merchant");
    if (stored) setMerchant(JSON.parse(stored));

    momoApi.get()
      .then((acc) => {
        setMomo(acc);
        setMomoForm({ accountName: acc.accountName, phoneNumber: acc.phoneNumber, network: acc.network });
      })
      .catch(() => {/* no momo account yet */});
  }, []);

  async function handleSaveMomo(e: React.FormEvent) {
    e.preventDefault();
    setSavingMomo(true);
    setMomoError(null);
    setMomoSuccess(false);
    try {
      const saved = await momoApi.save(momoForm);
      setMomo(saved);
      setMomoSuccess(true);
      setTimeout(() => setMomoSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMomoError(e.message ?? "Failed to save MoMo account.");
    } finally {
      setSavingMomo(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage your store and payment details</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile card (read-only) */}
        {merchant && (
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-sm font-semibold text-foreground mb-5">Store Profile</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xl">
                  {merchant.businessName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-base">{merchant.businessName}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  merchant.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"
                }`}>
                  {merchant.status}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Email", value: merchant.email },
                { label: "Phone", value: merchant.phoneNumber },
                { label: "Billing cycle", value: merchant.billingCycle },
                { label: "Billing start", value: new Date(merchant.billingStartDate).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" }) },
                { label: "Member since", value: new Date(merchant.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" }) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 text-sm py-2 border-b border-border last:border-0">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              ))}
              {merchant.description && (
                <div className="text-sm py-2">
                  <p className="text-muted mb-1">Description</p>
                  <p className="text-foreground">{merchant.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MoMo account */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Mobile Money Account</h2>
              <p className="text-xs text-muted mt-0.5">Shown to buyers who choose MoMo payment</p>
            </div>
            {momo && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                Active
              </span>
            )}
          </div>

          <form onSubmit={handleSaveMomo} className="flex flex-col gap-4">
            <Field label="Account Name">
              <input
                required
                value={momoForm.accountName}
                onChange={(e) => setMomoForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="Name registered with the network"
                className={inputCls}
              />
            </Field>

            <Field label="Phone Number">
              <input
                required
                value={momoForm.phoneNumber}
                onChange={(e) => setMomoForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="+233244000000"
                className={inputCls}
              />
            </Field>

            <Field label="Network">
              <div className="flex gap-2">
                {NETWORKS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMomoForm((f) => ({ ...f, network: n }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      momoForm.network === n
                        ? "bg-brand text-white border-brand"
                        : "border-border text-muted hover:border-brand hover:text-brand"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>

            {momoError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{momoError}</div>
            )}
            {momoSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                MoMo account saved successfully.
              </div>
            )}

            <button
              type="submit"
              disabled={savingMomo}
              className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-light transition disabled:opacity-60 mt-1"
            >
              {savingMomo ? "Saving…" : momo ? "Update MoMo Account" : "Save MoMo Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
