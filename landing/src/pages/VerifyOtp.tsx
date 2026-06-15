import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { resendOtp, verifyOtp } from "@/lib/api/auth";
import { qk } from "@/lib/queries";
import { toast } from "sonner";

export default function VerifyOtpPage() {
  const [code, setCode] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const verify = useMutation({
    mutationFn: () => verifyOtp(code),
    onSuccess: (parent) => { qc.setQueryData(qk.parent, parent); toast.success("Email verified!"); navigate("/dashboard"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resend = useMutation({
    mutationFn: resendOtp,
    onSuccess: () => toast.success("Code resent. (Demo code is still 123456.)"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift"><MailCheck className="h-7 w-7" /></div>
      <Card className="w-full p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code we sent to your email.<br /><span className="text-xs">(Demo code: <strong>123456</strong>)</span></p>
        <div className="mt-6 flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>{Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="btn-cta mt-6 w-full" disabled={code.length < 6 || verify.isPending} onClick={() => verify.mutate()}>{verify.isPending ? "Verifying…" : "Verify OTP"}</Button>
        <Button variant="ghost" className="mt-2 w-full" disabled={resend.isPending} onClick={() => resend.mutate()}>Resend code</Button>
      </Card>
    </div>
  );
}
