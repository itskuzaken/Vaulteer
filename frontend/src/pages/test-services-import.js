import React from "react";
import { getApplicationSettings } from "@/services";

export default function TestServicesImport() {
  React.useEffect(() => {
    (async () => {
      try {
        const res = await getApplicationSettings();
        console.log("Test services import: OK", res);
      } catch (err) {
        console.error("Test services import: ERROR", err);
      }
    })();
  }, []);

  return <div>Test services import page</div>;
}
