import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
// No custom Button/Input found, falling back to HTML + RetroButton if needed
import RetroButton from "@/components/ui/feedback/RetroButton";

export default function ResetPasswordPage() {
    const router = useRouter();
    const { token } = router.query;
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || typeof token !== "string") {
            setErrorMsg("Invalid reset link.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setErrorMsg("");

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            setStatus("success");
        } catch (err: any) {
            setStatus("error");
            setErrorMsg(err.message);
        }
    };

    if (status === "success") {
        return (
            <Layout>
                <Head>
                    <title>Password Reset | ThreadStead</title>
                </Head>
                <div className="max-w-md mx-auto mt-10 p-4">
                    <RetroCard title="Password Reset">
                        <div className="p-6 text-center space-y-4">
                            <div className="text-4xl">🎉</div>
                            <h3 className="text-xl font-bold font-pixel">Password Set!</h3>
                            <p className="text-gray-600">
                                Your password has been successfully updated. You can now log in with your new password.
                            </p>
                            <div className="pt-4">
                                <Link href="/login" className="retro-btn retro-btn-primary block w-full text-center py-2">
                                    Go to Login
                                </Link>
                            </div>
                        </div>
                    </RetroCard>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Head>
                <title>Reset Password | ThreadStead</title>
            </Head>
            <div className="max-w-md mx-auto mt-10 p-4">
                <RetroCard title="Reset Password">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-800">
                                <p className="font-bold mb-1">Warning:</p>
                                <p>
                                    Resetting your password via email will <strong>delete your server-side Seed Phrase backup</strong> because we cannot decrypt it without your old password.
                                </p>
                                <p className="mt-2">
                                    Make sure you have your Seed Phrase written down somewhere safe if you want to recover your identity later.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 font-pixel">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    minLength={8}
                                    className="w-full px-3 py-2 border border-black shadow-[2px_2px_0_#999] rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-pixel text-sm"
                                />
                            </div>
                        </div>

                        {status === "error" && (
                            <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200 text-sm">
                                Error: {errorMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black shadow-[4px_4px_0_#000] active:shadow-[2px_2px_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                            disabled={status === "loading" || !token}
                        >
                            {status === "loading" ? "Setting Password..." : "Set New Password"}
                        </button>
                    </form>
                </RetroCard>
            </div>
        </Layout>
    );
}
