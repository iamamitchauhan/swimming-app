import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { verifyEmail, resendVerification } from "@/lib/api/auth";
import { qk } from "@/lib/queries";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const verifyMut = useMutation({
    mutationFn: () => verifyEmail(code),
    onSuccess: async ({ token, user }) => {
      // Store auth token and user data
      localStorage.setItem('auth_token', token);
      qc.setQueryData(qk.parent, user);
      toast.success(`Welcome, ${user.firstName}! Your email has been verified.`);
      navigate("/dashboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendMut = useMutation({
    mutationFn: () => resendVerification("pending@example.com"), // TODO: Get actual email from pending registration
    onSuccess: () => toast.success("Verification email resent. Please check your inbox."),
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit verification code.");
      return;
    }
    verifyMut.mutate();
  };

  const handleCodeChange = (value: string) => {
    // Only allow numbers and max 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(numericValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Auto-submit when Enter is pressed and we have 6 digits
    if (e.key === 'Enter' && code.length === 6) {
      submit(e as any);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift">
        <Mail className="h-7 w-7" />
      </div>
      <Card className="w-full p-8">
        <div className="mb-6">
          <Link 
            to="/register" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to registration
          </Link>
        </div>
        
        <h1 className="font-display text-2xl font-bold">Verify your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We've sent a 6-digit verification code to your email address. 
          For demo purposes, use code <span className="font-mono font-semibold">123456</span>.
        </p>

        <form className="mt-6 space-y-6" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="code" className="text-center block">Verification code</Label>
            <div className="flex justify-center">
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="000000"
                className="w-32 text-center text-2xl tracking-widest font-mono"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          <Button 
            type="submit" 
            className="btn-cta w-full" 
            disabled={verifyMut.isPending || code.length !== 6}
          >
            {verifyMut.isPending ? "Verifying..." : "Verify email"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?
          </p>
          <Button
            variant="link"
            className="p-0 h-auto text-sm font-semibold text-primary hover:underline"
            onClick={() => resendMut.mutate()}
            disabled={resendMut.isPending}
          >
            {resendMut.isPending ? "Resending..." : "Resend verification email"}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            If you don't see the email, check your spam folder or 
            <Link to="/register" className="text-primary hover:underline ml-1">try a different email</Link>.
          </p>
        </div>
      </Card>
    </div>
  );
}
