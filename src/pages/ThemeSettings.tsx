import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemePreview } from '@/components/ThemeSwitcher';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, Monitor, Moon, Sun } from 'lucide-react';

export default function ThemeSettings() {
  const { theme } = useTheme();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Theme Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Theme Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemePreview />
          </CardContent>
        </Card>

        {/* Current Theme Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Current Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-lg mx-auto mb-3 border-2 border-gray-200"
                style={{ 
                  backgroundColor: `hsl(${theme === 'blue' ? '221, 83%, 53%' : 
                    theme === 'green' ? '142, 76%, 36%' :
                    theme === 'purple' ? '262, 83%, 58%' :
                    theme === 'red' ? '0, 84%, 60%' :
                    theme === 'orange' ? '24, 95%, 53%' :
                    theme === 'teal' ? '173, 80%, 40%' :
                    theme === 'indigo' ? '238, 100%, 67%' :
                    '330, 81%, 60%'})`
                }}
              />
              <h3 className="font-semibold capitalize">{theme}</h3>
              <p className="text-sm text-muted-foreground">
                Active color scheme
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Theme Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Consistent color palette</li>
                <li>• Accessible contrast ratios</li>
                <li>• Professional appearance</li>
                <li>• Brand-aligned design</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Themes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Color Psychology</h4>
              <p className="text-sm text-muted-foreground">
                Each theme is carefully selected to convey different emotions and 
                professional contexts. Blue suggests trust and reliability, green 
                represents growth and stability, while purple conveys creativity and luxury.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Accessibility</h4>
              <p className="text-sm text-muted-foreground">
                All themes meet WCAG 2.1 AA standards for color contrast and 
                accessibility. The color combinations ensure readability for users 
                with different visual abilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
