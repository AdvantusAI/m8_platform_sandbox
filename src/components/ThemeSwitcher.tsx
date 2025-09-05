import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Change theme"
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Change theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Choose Theme</h4>
          <p className="text-xs text-muted-foreground">
            Select a color scheme for your application
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {availableThemes.map((themeOption) => (
              <button
                key={themeOption.name}
                onClick={() => {
                  setTheme(themeOption.name);
                  setOpen(false);
                }}
                className={`
                  relative flex items-center gap-2 p-2 rounded-md border text-sm
                  transition-colors hover:bg-accent hover:text-accent-foreground
                  ${theme === themeOption.name 
                    ? 'bg-accent text-accent-foreground border-primary' 
                    : 'border-border'
                  }
                `}
              >
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: themeOption.color }}
                />
                <span className="flex-1 text-left">{themeOption.label}</span>
                {theme === themeOption.name && (
                  <Check className="h-3 w-3 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Alternative compact theme switcher for headers
export function CompactThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="flex items-center gap-1">
      {availableThemes.slice(0, 6).map((themeOption) => (
        <button
          key={themeOption.name}
          onClick={() => setTheme(themeOption.name)}
          className={`
            w-6 h-6 rounded-full border-2 transition-all hover:scale-110
            ${theme === themeOption.name 
              ? 'border-foreground scale-110' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          style={{ backgroundColor: themeOption.color }}
          title={`Switch to ${themeOption.label} theme`}
        />
      ))}
    </div>
  );
}

// Theme preview component for settings pages
export function ThemePreview() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Theme Selection</h3>
        <p className="text-sm text-muted-foreground">
          Choose a color scheme that matches your preferences
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {availableThemes.map((themeOption) => (
          <div
            key={themeOption.name}
            className={`
              relative p-4 rounded-lg border-2 cursor-pointer transition-all
              hover:shadow-md ${theme === themeOption.name 
                ? 'border-primary shadow-md' 
                : 'border-border hover:border-primary/50'
              }
            `}
            onClick={() => setTheme(themeOption.name)}
          >
            <div className="space-y-2">
              <div
                className="w-full h-8 rounded"
                style={{ backgroundColor: themeOption.color }}
              />
              <div className="text-sm font-medium">{themeOption.label}</div>
              {theme === themeOption.name && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
