import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../api/client";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiClient.post("/auth/password/forgot/", { email });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotMutation.mutate(email);
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 400, margin: "2rem auto", padding: "2rem" }}>
        <h1>Check your email</h1>
        <p>
          If an account with this email exists, a password reset link has been sent.
          The link will expire in 1 hour.
        </p>
        <button onClick={() => navigate("/login")}>Back to login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: "2rem" }}>
      <h1>Forgot password</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <button
          type="submit"
          disabled={forgotMutation.isPending}
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {forgotMutation.isPending ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{ marginTop: "1rem", background: "none", border: "none", cursor: "pointer" }}
      >
        Back to login
      </button>
    </div>
  );
}
