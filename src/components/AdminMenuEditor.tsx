import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MenuItemDef {
  title: string;
  url: string;
}

interface AdminMenuEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MenuItemDef[];
}

interface MenuRow {
  key: string;
  default_title: string | null;
  custom_title: string | null;
  icon_name: string | null;
  description: string | null;
}

export const AdminMenuEditor: React.FC<AdminMenuEditorProps> = ({ open, onOpenChange, items }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, MenuRow>>({});
  const [saving, setSaving] = useState(false);

  const keys = useMemo(() => items.map((i) => i.url), [items]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("key, default_title, custom_title, icon_name, description")
        .in("key", keys);
      if (error) {
        console.error("Error loading menu items:", error);
        toast.error("No se pudieron cargar las descripciones del menú");
        return;
      }
      const map: Record<string, MenuRow> = {};
      // Pre-fill with existing or defaults
      items.forEach((def) => {
        const existing = data?.find((d) => d.key === def.url);
        map[def.url] = {
          key: def.url,
          default_title: def.title,
          custom_title: existing?.custom_title ?? def.title,
          icon_name: existing?.icon_name ?? null,
          description: existing?.description ?? "",
        };
      });
      setRows(map);
    };
    load();
  }, [open, keys, items]);

  const handleChange = (key: string, value: string) => {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], description: value },
    }));
  };

  const handleTitleChange = (key: string, value: string) => {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], custom_title: value },
    }));
  };

  const handleIconChange = (key: string, value: string) => {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], icon_name: value || null },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = Object.values(rows).map((r) => ({
        key: r.key,
        default_title: r.default_title,
        custom_title: r.custom_title || null,
        icon_name: r.icon_name || null,
        description: r.description || null,
        updated_by: user?.id ?? null,
      }));

      const { error } = await supabase.from("menu_items").upsert(payload, { onConflict: "key" });
      if (error) throw error;
      toast.success("Descripciones guardadas");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar las descripciones");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Descripciones del menú</DialogTitle>
          <DialogDescription>
            Como administrador puedes actualizar el nombre, ícono y la descripción de cada opción del menú.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
          {items.map((item) => (
            <div key={item.url} className="space-y-3">
              <div>
                <Label className="text-sm">Opción: {item.title}</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre mostrado</Label>
                  <Input
                    placeholder="Nombre de la opción del menú"
                    value={rows[item.url]?.custom_title ?? ""}
                    onChange={(e) => handleTitleChange(item.url, e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Ícono</Label>
                  <Select
                    value={rows[item.url]?.icon_name ?? ""}
                    onValueChange={(v) => handleIconChange(item.url, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un ícono" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Curated list of icons */}
                      <SelectItem value="TrendingUp">TrendingUp</SelectItem>
                      <SelectItem value="Users">Users</SelectItem>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                      <SelectItem value="Network">Network</SelectItem>
                      <SelectItem value="ShoppingCart">ShoppingCart</SelectItem>
                      <SelectItem value="TrendingDown">TrendingDown</SelectItem>
                      <SelectItem value="ArrowLeftRight">ArrowLeftRight</SelectItem>
                      <SelectItem value="BarChart3">BarChart3</SelectItem>
                      <SelectItem value="Package">Package</SelectItem>
                      <SelectItem value="Building2">Building2</SelectItem>
                      <SelectItem value="Tag">Tag</SelectItem>
                      <SelectItem value="UserPlus">UserPlus</SelectItem>
                      <SelectItem value="UserCheck">UserCheck</SelectItem>
                      <SelectItem value="Settings">Settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  placeholder="Descripción visible en otras partes de la app"
                  value={rows[item.url]?.description ?? ""}
                  onChange={(e) => handleChange(item.url, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
