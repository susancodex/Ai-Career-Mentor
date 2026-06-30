import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../api/client";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetMutation = useMutation({
    mutationFn: async ({ token, new_password }: { token: string; new_password: string }) => {
      await apiClient.post("/auth/password/reset/", { token, new_password });
    },
    onSuccess: () => {
      navigate("/login");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    resetMutation.mutate({ token, new_password: password });
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: "2rem auto", padding: "2rem" }}>
        <h1>Invalid reset link</h1>
        <p>This password reset link is invalid or has expired.</p>
        <button onClick={() => navigate("/login")}>Back to login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: "2rem" }}>
      <h1>Reset password</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <button
          type="submit"
          disabled={resetMutation.isPending}
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {resetMutation.isPending ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
