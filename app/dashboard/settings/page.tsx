"use client";

import { useEffect, useRef, useState } from "react";
import { authApi, merchantApi, momoApi } from "../../lib/api";
import type { MerchantInfo, MomoAccount, MomoNetwork } from "../../lib/types";

const NETWORKS: MomoNetwork[] = ["MTN", "VODAFONE", "AIRTELTIGO"];

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error("Upload failed.");
  const data = await res.json();
  return data.secure_url as string;
}

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [momo, setMomo] = useState<MomoAccount | null>(null);
  const [momoForm, setMomoForm] = useState({ accountName: "", phoneNumber: "", network: "MTN" as MomoNetwork });
  const [savingMomo, setSavingMomo] = useState(false);
  const [momoSuccess, setMomoSuccess] = useState(false);
  const [momoError, setMomoError] = useState<string | null>(null);

  // Profile picture state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState(false);

  // Change password state
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

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

  function persistMerchant(next: MerchantInfo) {
    setMerchant(next);
    localStorage.setItem("kova_merchant", JSON.stringify(next));
  }

  async function saveLogo(logoUrl: string | null) {
    if (!merchant) return;
    setLogoError(null);
    setLogoSuccess(false);
    setUploadingLogo(true);
    try {
      const updated = await merchantApi.updateProfile({
        businessName: merchant.businessName,
        email: merchant.email,
        phoneNumber: merchant.phoneNumber,
        description: merchant.description,
        logoUrl,
      });
      persistMerchant(updated);
      setLogoSuccess(true);
      setTimeout(() => setLogoSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setLogoError(e.message ?? "Failed to update profile picture.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoFile(file: File) {
    setLogoError(null);
    setUploadingLogo(true);
    try {
      const url = await uploadToCloudinary(file);
      await saveLogo(url);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setLogoError(e.message ?? "Failed to upload image.");
      setUploadingLogo(false);
    }
  }

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwError("New password and confirmation do not match.");
      return;
    }
    if (pwForm.newPassword === pwForm.oldPassword) {
      setPwError("New password must be different from your old password.");
      return;
    }

    setSavingPw(true);
    try {
      const res = await authApi.changePassword(pwForm);
      setPwForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
      setPwSuccess(res.message ?? "Password updated successfully.");
      setTimeout(() => setPwSuccess(null), 3000);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 401) setPwError("Your old password is incorrect.");
      else setPwError(e.message ?? "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage your store and payment details</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile card */}
        {merchant && (
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-sm font-semibold text-foreground mb-5">Store Profile</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-20 h-20 shrink-0">
                {merchant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={merchant.logoUrl}
                    alt={merchant.businessName}
                    className={`w-20 h-20 rounded-2xl object-cover border border-border ${uploadingLogo ? "opacity-50" : ""}`}
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-2xl bg-brand flex items-center justify-center ${uploadingLogo ? "opacity-50" : ""}`}>
                    <span className="text-white font-bold text-2xl">
                      {merchant.businessName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-base truncate">{merchant.businessName}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  merchant.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"
                }`}>
                  {merchant.status}
                </span>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:border-brand hover:text-brand transition disabled:opacity-60"
                  >
                    {merchant.logoUrl ? "Change photo" : "Upload photo"}
                  </button>
                  {merchant.logoUrl && (
                    <button
                      type="button"
                      onClick={() => saveLogo(null)}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted hover:border-red-200 hover:text-red-600 transition disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {logoError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-4">{logoError}</div>
            )}
            {logoSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 mb-4">
                Profile picture updated.
              </div>
            )}
            {!CLOUD_NAME && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
                Cloudinary is not configured. Add <code className="font-mono">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> and <code className="font-mono">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code> to your <code className="font-mono">.env.local</code>.
              </p>
            )}

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

        {/* Change password */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
            <p className="text-xs text-muted mt-0.5">Use at least 8 characters</p>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <Field label="Old Password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={pwForm.oldPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>

            <Field label="New Password">
              <input
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="At least 8 characters"
                className={inputCls}
              />
            </Field>

            <Field label="Confirm New Password">
              <input
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={pwForm.confirmNewPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmNewPassword: e.target.value }))}
                placeholder="Re-enter new password"
                className={inputCls}
              />
            </Field>

            {pwError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{pwError}</div>
            )}
            {pwSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                {pwSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={savingPw}
              className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-light transition disabled:opacity-60 mt-1"
            >
              {savingPw ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

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
