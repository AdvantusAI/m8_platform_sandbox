import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Theme Preferences
        </CardTitle>
        <CardDescription>
          Choose your preferred theme for the dashboard interface
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            className="flex flex-col gap-2 h-20"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-5 w-5" />
            <span className="text-sm">Light</span>
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            className="flex flex-col gap-2 h-20"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-5 w-5" />
            <span className="text-sm">Dark</span>
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            className="flex flex-col gap-2 h-20"
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-sm">System</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Current theme: <span className="font-medium capitalize">{theme}</span>
        </p>
      </CardContent>
    </Card>
  );
}

export function ThemeToggleDropdown() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}