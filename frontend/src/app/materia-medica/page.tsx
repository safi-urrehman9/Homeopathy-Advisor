import { Suspense } from "react";

import { MateriaMedicaPage } from "@/features/materia-medica/materia-medica-page";

export default function Page() {
  return (
    <Suspense>
      <MateriaMedicaPage />
    </Suspense>
  );
}
