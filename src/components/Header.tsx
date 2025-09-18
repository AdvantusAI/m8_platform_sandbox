
import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/UserMenu";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

export function Header() {
  const [systemDate, setSystemDate] = useState<string>("");

  useEffect(() => {
    fetchSystemDate();
  }, []);

  const fetchSystemDate = async () => {
    try {
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('system_config')
        .select('system_date')
        .single();

      if (error) throw error;
      
      if (data?.system_date) {
        // Parse the date correctly to avoid timezone issues
        // Add 'T00:00:00' to ensure it's treated as local date, not UTC
        const dateString = data.system_date.includes('T') ? data.system_date : `${data.system_date}T00:00:00`;
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC' // Force UTC to avoid timezone conversion
        });
        setSystemDate(formattedDate);
      }
    } catch (error) {
      console.error('Error fetching system date:', error);
      // Fallback to current date if system date is not available
      const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setSystemDate(currentDate);
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4 bg-white ml-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold text-gray-900">M8 Platform</h1>
      </div>
      <div className="flex items-center gap-4">
        {systemDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            
            <span className="text-gray-900 font-semibold">{systemDate}</span>
          </div>
        )}
        <ThemeSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
