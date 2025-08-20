import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-enterprise";
import "ag-grid-enterprise";
import "@/styles/ag-grid-custom.css";
import { supabase } from "@/integrations/supabase/client";
import { configureAGGridLicense, defaultGridOptions } from "@/lib/ag-grid-config";
import { toast } from "sonner";

const ForecastExceptions: React.FC = () => {
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const columnDefs: ColDef[] = useMemo(() => {
    if (!rowData || rowData.length === 0) return [];
    const sample = rowData[0];
    return Object.keys(sample).map((key) => ({
      field: key,
      headerName: key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      filter: true,
      sortable: true,
      resizable: true,
    }));
  }, [rowData]);

  useEffect(() => {
    // SEO basics
    const title = "Excepciones del Forecast | M8 Platform";
    document.title = title;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta(
      "description",
      "Excepciones del forecast mostradas en una tabla AG Grid desde m8_schema.forecast_exceptions"
    );

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  useEffect(() => {
    configureAGGridLicense();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .schema("m8_schema")
        .from("forecast_exceptions")
        .select("*")
        .limit(1000);

      if (error) throw error;
      setRowData(data || []);
    } catch (err: any) {
      console.error("Error fetching forecast exceptions:", err);
      toast.error("Error cargando excepciones del forecast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Excepciones del Forecast</h1>
      </header>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Listado de Excepciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="ag-theme-quartz ag-theme-custom" style={{ height: 600, width: "100%" }}>
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                loadingOverlayComponentParams={{ loadingMessage: "Cargando..." }}
                {...defaultGridOptions}
              />
            </div>
            {loading && <div className="mt-2 text-sm text-muted-foreground">Cargando datos...</div>}
            {!loading && rowData.length === 0 && (
              <div className="mt-2 text-sm text-muted-foreground">No hay datos para mostrar.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default ForecastExceptions;
