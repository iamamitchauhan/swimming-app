import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { verifyEmail } from "@/lib/api/auth";
import { qk } from "@/lib/queries";
import { toast } from "sonner";

export default function AutoVerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  
  const token = searchParams.get('token');
  const hasVerified = useRef(false);
  
  const verifyMut = useMutation({
    mutationFn: (t: string) => verifyEmail(t),
    onSuccess: async ({ token: authToken, user }) => {
      // Persist session to localStorage so it survives page refresh
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(user));
      qc.setQueryData(qk.parent, user);
      toast.success(`Welcome, ${user.firstName}! Your email has been verified successfully.`);
      
      setTimeout(() => {
        navigate("/");
      }, 1500);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setTimeout(() => {
        navigate("/register");
      }, 3000);
    },
  });

  useEffect(() => {
    if (hasVerified.current) return; // prevent React Strict Mode double-invoke
    hasVerified.current = true;

    if (!token) {
      toast.error("Invalid verification link. Missing token.");
      setTimeout(() => navigate("/register"), 3000);
      return;
    }
    verifyMut.mutate(token);
  }, []); // run once on mount only

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift">
        {verifyMut.isPending ? (
          <Mail className="h-7 w-7 animate-pulse" />
        ) : verifyMut.isSuccess ? (
          <CheckCircle className="h-7 w-7" />
        ) : (
          <AlertCircle className="h-7 w-7" />
        )}
      </div>
      
      <Card className="w-full p-8 text-center">
        {verifyMut.isPending && (
          <>
            <h1 className="font-display text-2xl font-bold">Verifying your email...</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we verify your email address.
            </p>
            <div className="mt-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </>
        )}
        
        {verifyMut.isSuccess && (
          <>
            <h1 className="font-display text-2xl font-bold text-green-600">Email Verified!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your email has been successfully verified.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Redirecting you to your dashboard...
            </p>
          </>
        )}
        
        {verifyMut.isError && (
          <>
            <h1 className="font-display text-2xl font-bold text-red-600">Verification Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {verifyMut.error?.message || "Invalid or expired verification link."}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Redirecting you to registration page...
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/register")}
            >
              Go to Registration
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
