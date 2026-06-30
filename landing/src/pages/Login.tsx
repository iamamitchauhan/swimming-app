import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Waves, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/api/auth";
import { qk } from "@/lib/queries";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const sendOtpMut = useMutation({
    mutationFn: () => requestLoginOtp(email),
    onSuccess: () => {
      setOtpSent(true);
      toast.success("OTP sent! Check your email.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyOtpMut = useMutation({
    mutationFn: () => verifyLoginOtp(email, otp),
    onSuccess: ({ token, user }) => {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
      qc.setQueryData(qk.parent, user);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate("/");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (otpSent) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift">
          <MailCheck className="h-7 w-7" />
        </div>
        <Card className="w-full p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Enter your OTP</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
            .
          </p>
          <div className="mt-6 flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="w-15 h-15 text-2xl" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            className="btn-cta mt-6 w-full"
            disabled={otp.length < 6 || verifyOtpMut.isPending}
            onClick={() => verifyOtpMut.mutate()}
          >
            {verifyOtpMut.isPending ? "Verifying…" : "Verify OTP"}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Didn't receive it?{" "}
            <button
              className="font-semibold text-primary hover:underline"
              disabled={sendOtpMut.isPending}
              onClick={() => {
                setOtp("");
                sendOtpMut.mutate();
              }}
            >
              Resend OTP
            </button>
            {" · "}
            <button
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
              }}
            >
              Change email
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift">
        <Waves className="h-7 w-7" />
      </div>
      <Card className="w-full p-8">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email to receive a one-time login code.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            sendOtpMut.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="btn-cta w-full" disabled={sendOtpMut.isPending}>
            {sendOtpMut.isPending ? "Sending OTP…" : "Send OTP"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
