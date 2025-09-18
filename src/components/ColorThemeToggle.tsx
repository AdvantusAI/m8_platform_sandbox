import { Palette } from "lucide-react";
import { useColorTheme } from "@/hooks/useColorTheme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ColorThemeToggle() {
  const { colorTheme, setColorTheme } = useColorTheme();

  const themes = [
    { name: "purple", label: "Purple", color: "bg-purple-500" },
    { name: "orange", label: "Orange", color: "bg-orange-500" },
    { name: "blue", label: "Blue", color: "bg-blue-500" },
    { name: "black", label: "Black", color: "bg-gray-900" },
  ] as const;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Color Theme
        </CardTitle>
        <CardDescription>
          Choose your preferred color scheme for the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {themes.map((theme) => (
            <Button
              key={theme.name}
              variant={colorTheme === theme.name ? "default" : "outline"}
              className="flex flex-col gap-2 h-20"
              onClick={() => setColorTheme(theme.name)}
            >
              <div className={`w-6 h-6 rounded-full ${theme.color}`} />
              <span className="text-sm">{theme.label}</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Current color: <span className="font-medium capitalize">{colorTheme}</span>
        </p>
      </CardContent>
    </Card>
  );
}