import { Suspense } from "react";

import { ConsultationPage } from "@/features/consultation/consultation-page";

export default function Page() {
  return (
    <Suspense>
      <ConsultationPage />
    </Suspense>
  );
}
