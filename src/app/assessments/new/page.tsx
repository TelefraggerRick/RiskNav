"use client";

import RiskAssessmentForm from "@/components/risk-assessments/RiskAssessmentForm";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NewAssessmentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (data: RiskAssessmentFormData) => {
    setIsLoading(true);
    console.log("Submitting new risk assessment:", data);

    // --- TODO: Implement actual submission logic ---
    // This would involve:
    // 1. Uploading files in data.attachments (if any File objects exist) to a storage service.
    // 2. Getting URLs for uploaded files.
    // 3. Creating a new RiskAssessment object with these URLs and other form data.
    // 4. Saving this object to a database (e.g., Firestore) via a server action.
    // Example:
    // const submissionResult = await submitRiskAssessmentAction(data);
    // if (submissionResult.success) { ... } else { ... }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // --- End of TODO ---

    setIsLoading(false);
    toast({
      title: "Assessment Submitted Successfully",
      description: `Risk assessment for ${data.vesselName} has been submitted. You will be redirected to the dashboard.`,
      variant: "default",
    });
    // Using a timeout to let user read the toast before redirect
    setTimeout(() => router.push("/"), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
       <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">New Risk Assessment</h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <RiskAssessmentForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
